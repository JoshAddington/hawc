import React, { Component } from 'react';
import { connect } from 'react-redux';

import { fetchStudyIfNeeded, selectActive } from 'robTable/actions';
import DomainDisplay from 'robTable/components/DomainDisplay';
import ShowAll from 'robTable/components/ShowAll';
import Loading from 'shared/components/Loading';


class RiskOfBiasDisplay extends Component {

    componentWillMount(){
        this.props.dispatch(fetchStudyIfNeeded());
    }

    handleShowAllClick(){
        let { dispatch } = this.props;
        dispatch(selectActive({domain: 'all'}));
    }

    render(){
        let { itemsLoaded, active, display } = this.props;
        if (!itemsLoaded) return <Loading />;

        return (
            <div className='riskofbias-display'>
                {_.map(active, (domain) => {
                    return <DomainDisplay key={domain.key}
                                       domain={domain}
                                       display={display} />;
                })}
                <ShowAll handleClick={this.handleShowAllClick.bind(this)} />
            </div>
        );
    }
}

function mapStateToProps(state){
    return {
        itemsLoaded: state.study.itemsLoaded,
        active: state.study.active,
        display: state.config.display,
    };
}

export default connect(mapStateToProps)(RiskOfBiasDisplay);
