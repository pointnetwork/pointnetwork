import Table from 'react-bootstrap/Table';
import ExampleContentRow from "./ExampleContentRow";

const ExampleContentTable = ({examples}) => {
    return (
        <Table striped bordered hover variant="dark">
            <thead>
                <tr>
                    <th></th>
                    <th>#</th>
                    <th>When</th>
                    <th>Contents</th>
                </tr>
            </thead>
            <tbody>
            {examples.map((example) => (
                <ExampleContentRow key={example.id} example={example} />
            ))}
            </tbody>
        </Table>
    )
}

export default ExampleContentTable