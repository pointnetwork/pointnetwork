import React from 'react'
import PropTypes from 'prop-types'

const Button = ({ color, text, onClick }) => {
    return (
        <button style={{ backgroundColor: color }} className='btn' onClick={onClick}>
            {text}
        </button>
    )
}

Button.propTypes = {
    color: PropTypes.string,
    text: PropTypes.string,
    onClick: PropTypes.func
}

Button.defaultProps = {
    color: 'steelblue',
    text: 'Click'
}

export default Button