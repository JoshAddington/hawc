import React, { Component, PropTypes } from 'react';

import MetricDisplay from 'robTable/components/MetricDisplay';


class DomainDisplay extends Component {

    render(){
        let { domain, isForm, display } = this.props;
        return (
            <div>
                <hr/>
                <h3>{domain.key}</h3>
                {_.map(domain.values, (metric) => {
                    return <MetricDisplay key={metric.key}
                                          ref={_.last(metric.values).id}
                                          metric={metric}
                                          isForm={isForm}
                                          display={display}/>;
                })}
            </div>
        );
    }

}

DomainDisplay.propTypes = {
    domain: PropTypes.shape({
        key: PropTypes.string.isRequired,
        values: PropTypes.array.isRequired,
    }).isRequired,
    isForm: PropTypes.object,
    display: PropTypes.string,
};

export default DomainDisplay;
