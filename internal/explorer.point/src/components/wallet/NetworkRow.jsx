export default function NetworkRow({ network }) {
    return (
        <tr key={network} className="wallet-row network-row">
            <th>{network.name}</th>
        </tr>
    );
}
