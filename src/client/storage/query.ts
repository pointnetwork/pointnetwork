import {gql} from 'graphql-request';
import {VERSION_MAJOR, VERSION_MINOR} from './config';

const getDownloadQuery = (chunkId: string): string =>
    gql`{
      transactions(
        tags: [
          {
            name: "__pn_chunk_${VERSION_MAJOR}.${VERSION_MINOR}_id",
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
