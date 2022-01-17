import { Resolvers } from '../../schema';

const balancerResolvers: Resolvers = {
    Query: {
        pools: async (parent, {}, context) => {
            return [];
        },
    },
};

export default balancerResolvers;
