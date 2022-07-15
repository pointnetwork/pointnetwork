export default function ErrorBlock({
    title = 'Sorry, something went wrong.',
    details = '',
}) {
    return (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
            <h4>{title}</h4>
            <p>
                <em>{details}</em>
            </p>
        </div>
    );
}
