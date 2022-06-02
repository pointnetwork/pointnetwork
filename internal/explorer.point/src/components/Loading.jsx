import React from 'react';

const Loading = (props) => {
    const { className, style = {} } = props;
    return (
        <div className={`spinner-border ${className}`} style={style} role="status"></div>
    )
}

export default Loading;
