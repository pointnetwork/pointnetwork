import {gql} from 'graphql-request';
import config from 'config';

const getDownloadQuery = (chunkId: string): string =>
    gql`{
      transactions(
        tags: [
          {
            name: "__pn_chunk_${config.get(
        'storage.arweave_experiment_version_major'
    )}.${config.get('storage.arweave_experiment_version_minor')}_id",
            values: ["${chunkId}"]
          }
        ]
      ) {
        edges {
          node {
            id
          }
        }
      }
    }`;

export default getDownloadQuery;
