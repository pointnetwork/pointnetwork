import Image from 'react-bootstrap/Image';
import avatar from '../assets/noAvatar.png';
import { format } from "timeago.js";

const ExampleContentRow = ({example}) => {
    return (
        <tr>
            <td><Image src={avatar} thumbnail width="32" height="32" /></td>
            <td>{example.id}</td>
            <td>{format(example.createdAt)}</td>
            <td>{example.contents}</td>
        </tr>
    )
}

export default ExampleContentRow
