import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import { useEffect, useState } from "react";
import ExampleContentTable from '../components/ExampleContentTable';
import { useAppContext } from '../context/AppContext';

export default function Contracts({account}) {
  const [examples, setExamples] = useState([])
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(undefined);
  const { csrfToken } = useAppContext();

  useEffect(() => {
    const getExamples = async () => {
      const examples = await fetchExamples()
      setExamples(examples);
      setLoading(false);
    }

    getExamples()
  }, [account])

  const fetchExamples = async () => {
    try {
      const response = account
        ? await window.point.contract.call({contract: 'Template', method: 'getAllExamplesByOwner', params: [account], csrfToken}) :
      await window.point.contract.call({contract: 'Template', method: 'getAllExamples', csrfToken})

      const examples = response.data.map(([id, from, contents, createdAt]) => (
          {id, from, contents, createdAt: createdAt*1000}
        )
      )

      const examplesContent = await Promise.all(examples.map(async (example) => {
        const {data: contents} = await window.point.storage.getString({ id: example.contents, encoding: 'utf-8' });
        example.contents = contents;
        return example;
      }))

      return examplesContent;
    } catch(e) {
      console.error('Error loading feed: ', e.message);
      setLoadingError(e);
      setLoading(false);
    }
  }

  return (
    <>
        <Container className="p-3">
            <h1 className="header">Example Smart Contract Call</h1>
            <p>Content displayed below is from a call to the Template Smart Contract with contents subsequently fetched from the Point Storage Layer.</p>
            <div>
              {loading && !loadingError && <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>}
              {(!loading && loadingError) && <span className="error">Error loading data: {loadingError.message}. Did you deploy the contract sucessfully??</span>}
              {(!loading && !loadingError && examples.length == 0) && 'No examples found!'}
              {(!loading && !loadingError && examples.length > 0) && <ExampleContentTable examples={examples} />}
            </div>
        </Container>
    </>
  );
}