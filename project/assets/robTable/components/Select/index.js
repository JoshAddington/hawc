import React, { Component, PropTypes } from 'react';

import './Select.css';


class Select extends Component {
    handleSelect(e){
        this.props.handleSelect(e.target.value);
    }

    render() {
        let { id, defVal, choices } = this.props;
        return (
            <select className='react-select'
                    id={id}
                    ref='select'
                    defaultValue={defVal}
                    onChange={this.handleSelect.bind(this)}>
                {_.map(choices, (choice, key) => {
                    return <option key={key} value={key}>{choice}</option>;
                })}
            </select>
        );
    }
}

Select.propTypes = {
    handleSelect: PropTypes.func.isRequired,
    choices: PropTypes.object.isRequired,
    id: PropTypes.string.isRequired,
    defVal: PropTypes.any.isRequired,
};

export default Select;
