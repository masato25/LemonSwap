// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PositionValue} from "@uniswap/v3-periphery/contracts/libraries/PositionValue.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {INonfungiblePositionManager} from "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "./LemonSwapLibs.sol";

contract LemonSwap is ReentrancyGuardUpgradeable {
    using SafeMath for uint256;
    /// @notice Uniswap position manager address
    address public UNI_POSITION_MANAGER =
        0xC36442b4a4522E871399CD717aBDD847Ab11FE88;
    /// @notice Uniswap router address
    address public UNISWAP_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;
    /// @notice Uniswap v3 liquidity pool address
    address public uniswapPool;

    uint256 totalPositions;
    /// @notice Uniswap position info
    mapping(uint256 => Positions.Position) public positions;

    /// @notice Uniswap position id by user
    mapping(address => uint256[]) public userPositionIds;

    function init(address _UNI_POSITION_MANAGER, address _UNISWAP_ROUTER) public initializer {
        if (_UNI_POSITION_MANAGER != address(0)) {
          UNI_POSITION_MANAGER = _UNI_POSITION_MANAGER;
        }
        if (_UNISWAP_ROUTER != address(0)) {
          UNISWAP_ROUTER = _UNISWAP_ROUTER;
        }
        __ReentrancyGuard_init();
    }

    function openPosition(
        Positions.StrategyParams calldata _strategyParams
    ) external nonReentrant {
        IUniswapV3Pool unipoolInstance = IUniswapV3Pool(_strategyParams.uniswapPool);
        address token0 = unipoolInstance.token0();
        address token1 = unipoolInstance.token1();
        address provideToken = _strategyParams.provideToken0
            ? unipoolInstance.token0()
            : unipoolInstance.token1();
        IERC20(provideToken).approve(
            UNI_POSITION_MANAGER,
            _strategyParams.tokenAmount
        );
        uint24 uniFee = unipoolInstance.fee();
        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: uniFee,
                tickLower: _strategyParams.upperPriceTick,
                tickUpper: _strategyParams.lowerPriceTick,
                amount0Desired: _strategyParams.provideToken0
                    ? _strategyParams.tokenAmount
                    : 0,
                amount1Desired: _strategyParams.provideToken0
                    ? 0
                    : _strategyParams.tokenAmount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });
        (, int24 tick, , , , , ) = unipoolInstance.slot0();
        (uint256 tokenId, , , ) = INonfungiblePositionManager(
            UNI_POSITION_MANAGER
        ).mint(params);

        Positions.Position memory _newPosition = Positions.Position({
            unipool: _strategyParams.uniswapPool,
            positionId: tokenId,
            owner: msg.sender,
            provideToken0: _strategyParams.provideToken0,
            provideTokenAmountAtStart: _strategyParams.tokenAmount,
            positionCreateTimestamp: block.timestamp,
            startPriceTick: tick,
            upperPriceTick: _strategyParams.upperPriceTick,
            lowerPriceTick: _strategyParams.lowerPriceTick
        });

        positions[_newPosition.positionId] = _newPosition;
        userPositionIds[msg.sender].push(_newPosition.positionId);
    }

    function getPositionTokenAmount(
        address _uniswapPool,
        uint256 _positionId
    )
        public
        view
        returns (
            uint256 token0Amount,
            uint256 token1Amount,
            uint256 token0Fee,
            uint256 token1Fee
        )
    {
        (uint160 sqrtPriceX96, , , , , , ) = IUniswapV3Pool(_uniswapPool)
            .slot0();
        (uint256 amount0, uint256 amount1) = PositionValue.principal(
            INonfungiblePositionManager(UNI_POSITION_MANAGER),
            _positionId,
            sqrtPriceX96
        );
        (uint256 fee0, uint256 fee1) = PositionValue.fees(
            INonfungiblePositionManager(UNI_POSITION_MANAGER),
            _positionId
        );
        return (amount0, amount1, fee0, fee1);
    }

    function checkSwapComplete(
        uint256 _positionId
    )  public
        view
        returns (bool) {
      Positions.Position memory _position = positions[_positionId];
      (
        uint256 token0Amount,
        uint256 token1Amount,
        ,
      ) = getPositionTokenAmount(
          _position.unipool,
          _positionId
      );
      if (_position.provideToken0) {
        return token0Amount == 0;
      } else {
        return token1Amount == 0;
      }
    }
    
    function closePosition(
        uint256 _positionId
    ) external nonReentrant {
      Positions.Position memory _position = positions[_positionId];
      require(_position.owner == msg.sender || checkSwapComplete(_positionId));
      _closePosition(_positionId);
    }

    function _closePosition(
        uint256 _positionId
    ) internal {
        Positions.Position memory _position = positions[_positionId];
        (
            uint256 token0Amount,
            uint256 token1Amount,
            uint256 token0FeeAmount,
            uint256 token1FeeAmount
        ) = getPositionTokenAmount(
            _position.unipool,
            _positionId
        );

        (, , , , , , , uint128 liquidity, , , , ) = INonfungiblePositionManager(
            UNI_POSITION_MANAGER
        ).positions(_positionId);

        // scope to avoid stack too deep errors
        {
          INonfungiblePositionManager.DecreaseLiquidityParams
              memory params = INonfungiblePositionManager
                  .DecreaseLiquidityParams({
                      tokenId: _positionId,
                      liquidity: liquidity,
                      amount0Min: token0Amount,
                      amount1Min: token1Amount,
                      deadline: block.timestamp
                  });
          INonfungiblePositionManager(UNI_POSITION_MANAGER).decreaseLiquidity(
              params
          );
        }

        {
          INonfungiblePositionManager.CollectParams
              memory collectParams = INonfungiblePositionManager.CollectParams({
                  tokenId: _positionId,
                  recipient: address(this),
                  amount0Max: uint128(token0FeeAmount),
                  amount1Max: uint128(token1FeeAmount)
              });

          (uint256 amount0, uint256 amount1) = INonfungiblePositionManager(
              UNI_POSITION_MANAGER
          ).collect(collectParams);

          IUniswapV3Pool unipoolInstance = IUniswapV3Pool(_position.unipool);
          address token0 = unipoolInstance.token0();
          address token1 = unipoolInstance.token1();
          uint256 token0Send = token0Amount.add(amount0);
          uint256 token1Send = token1Amount.add(amount1);
          address receiver = _position.owner;
          IERC20(token0).transfer(receiver, token0Send);
          IERC20(token1).transfer(receiver, token1Send);
        }

        // scope to avoid stack too deep errors
        {
          // _removePositionAndReorder
          delete positions[_positionId];
          uint256 positionIndex = _findPositionIndex(_position.owner, _positionId);
          userPositionIds[_position.owner][positionIndex] = userPositionIds[_position.owner][
              userPositionIds[_position.owner].length - 1
          ];
          userPositionIds[_position.owner].pop();
          totalPositions = totalPositions.sub(1);
        }
    }

    function _findPositionIndex(address _account, uint256 _positionId)
        internal
        view
        returns (uint256)
    {
        uint256 positionLength = userPositionIds[_account].length;
        require(positionLength != 0, "02");
        for (uint256 i = 0; i < positionLength; i = i + 1) {
            if (userPositionIds[_account][i] == _positionId) {
                return i;
            }
        }
        revert("17");
    }
}
