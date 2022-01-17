import { blocksSubgraphService } from '../blocks-subgraph/blocks-subgraph.service';
import { getOnChainBalances } from './src/onchainData';
import { providers } from 'ethers';
import { env } from '../../app/env';
import { BALANCER_NETWORK_CONFIG } from './src/contracts';
import moment from 'moment-timezone';
import { parseInt } from 'lodash';
import { cache } from '../cache/cache';
import { BalancerSDK, Network, SubgraphPoolFragment } from '@balancer-labs/sdk';
import { Provider } from '@ethersproject/providers';

const POOLS_CACHE_KEY = 'pools:all';
const PAST_POOLS_CACHE_KEY = 'pools:24h';
const TOP_TRADE_PAIRS_CACHE_KEY = 'balancer:topTradePairs';

export class BalancerService {
    private readonly sdk: BalancerSDK;
    private readonly provider: Provider;

    constructor() {
        this.sdk = new BalancerSDK({ network: Network.MAINNET, rpcUrl: env.RPC_URL });
        this.provider = new providers.JsonRpcProvider(env.RPC_URL);
    }

    public async getPools(): Promise<SubgraphPoolFragment[]> {
        const cached = await cache.getObjectValue<SubgraphPoolFragment[]>(POOLS_CACHE_KEY);

        if (cached) {
            return cached;
        }

        return this.cachePools();
    }

    /*public async getPastPools(): Promise<SubgraphPoolFragment[]> {
        const cached = await cache.getObjectValue<SubgraphPoolFragment[]>(PAST_POOLS_CACHE_KEY);

        if (cached) {
            return cached;
        }

        return this.cachePastPools();
    }*/

    public async cachePools(): Promise<SubgraphPoolFragment[]> {
        const { pools } = await this.sdk.subgraphClient.Pools({
            first: 1000,
            orderBy: 'totalLiquidity',
            orderDirection: 'desc',
        });

        return this.cachePoolOnChainBalances(pools);
    }

    public async updatePoolOnChainBalances(): Promise<void> {
        const pools = await this.getPools();

        await this.cachePoolOnChainBalances(pools);
    }

    private async cachePoolOnChainBalances(pools: SubgraphPoolFragment[]): Promise<SubgraphPoolFragment[]> {
        const poolsWithOnChainBalances = await getOnChainBalances(
            pools,
            BALANCER_NETWORK_CONFIG[`${env.CHAIN_ID}`].multicall,
            BALANCER_NETWORK_CONFIG[`${env.CHAIN_ID}`].vault,
            this.provider,
        );

        await cache.putObjectValue(POOLS_CACHE_KEY, poolsWithOnChainBalances);

        return poolsWithOnChainBalances;
    }

    /* public async cachePastPools(): Promise<SubgraphPoolFragment[]> {
        const block = await blocksSubgraphService.getBlockFrom24HoursAgo();
        const blacklistedPools = await this.getBlacklistedPools();
        const pools = await balancerSubgraphService.getAllPools({
            orderBy: Pool_OrderBy.TotalLiquidity,
            orderDirection: OrderDirection.Desc,
            block: { number: parseInt(block.number) },
        });

        const filtered = pools.filter((pool) => {
            if (blacklistedPools.includes(pool.id)) {
                return false;
            }

            if (parseFloat(pool.totalShares) < 0.01) {
                return false;
            }

            return true;
        });

        await cache.putObjectValue(PAST_POOLS_CACHE_KEY, filtered);

        return filtered;
    }

    public async getTopTradingPairs(): Promise<BalancerTradePairSnapshotFragment[]> {
        const cached = await cache.getObjectValue<BalancerTradePairSnapshotFragment[]>(TOP_TRADE_PAIRS_CACHE_KEY);

        if (cached) {
            return cached;
        }

        return this.cacheTopTradingPairs();
    }

    public async cacheTopTradingPairs(): Promise<BalancerTradePairSnapshotFragment[]> {
        const timestamp = moment().utc().startOf('day').unix();

        const { tradePairSnapshots } = await balancerSubgraphService.getTradePairSnapshots({
            first: 5,
            orderBy: TradePairSnapshot_OrderBy.TotalSwapVolume,
            orderDirection: OrderDirection.Desc,
            where: { timestamp_gt: timestamp },
        });

        await cache.putObjectValue(TOP_TRADE_PAIRS_CACHE_KEY, tradePairSnapshots, oneDayInMinutes);

        return tradePairSnapshots;
    }*/
}

export const balancerService = new BalancerService();
