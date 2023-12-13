export default function SpacingRow({ position }) {
    fontSize = position === 'before' ? '1em' : '0.1em';

    return (
        <tr style={{ fontSize, borderColor: 'transparent' }}>
            <td>&nbsp;</td>
        </tr>
    );
}
