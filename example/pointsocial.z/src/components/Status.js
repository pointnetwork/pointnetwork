import { Link } from 'wouter'

const Status = ({ status, viewStatus }) => {
    return (
        <Link href={ `/status/${ status.id }` }>
            <div className='status'>
                <h3>{status.contents}</h3>
                <h4>From: {status.from}</h4>
            </div>
        </Link>
    )
}

export default Status