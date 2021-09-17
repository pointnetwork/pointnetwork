import Status from './Status'

const Statuses = ({ statuses }) => {
    return (
        <>
            { statuses.map((status) => (
                <Status
                  key={status.id}
                  status={status}>
                </Status>
            )) }
        </>
    )
}

export default Statuses