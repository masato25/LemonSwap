pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

library Positions {
    struct Position {
        address unipool;
        // Uniswap position NFT id
        uint256 positionId;
        // positino owner, aka open position msg.sender
        address owner;
        bool provideToken0;
        // provide token amount when open position
        uint256 provideTokenAmountAtStart;
        // the timestamp when this position created
        uint256 positionCreateTimestamp;
        // borrow token price when open position
        int24 startPriceTick;
        // stop loss upper bound, keeper should can stop loss when price higher than this value (can be updated)
        int24 upperPriceTick;
        // stop loss lower bound, keeper should can stop loss when price lower than this value (can be updated)
        int24 lowerPriceTick;
    }

    struct StrategyParams {
        address uniswapPool;
        bool provideToken0;
        uint256 tokenAmount;
        int24 upperPriceTick;
        int24 lowerPriceTick;
    }
}
