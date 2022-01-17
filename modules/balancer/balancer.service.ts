import { blocksSubgraphService } from '../blocks-subgraph/blocks-subgraph.service';
import { getOnChainBalances } from './src/onchainData';
import { providers } from 'ethers';
import { env } from '../../app/env';
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
            this.sdk.network.multicall,
            this.sdk.network.vault,
            this.provider,
        );

        await cache.putObjectValue(POOLS_CACHE_KEY, poolsWithOnChainBalances);

        return poolsWithOnChainBalances;
    }
}

export const balancerService = new BalancerService();
