import React, { Component, PropTypes } from 'react';

import ScoreDisplay from 'robTable/components/ScoreDisplay';
import ScoreForm from 'robTable/components/ScoreForm';
import './MetricDisplay.css';


class MetricDisplay extends Component {

    renderScoreRow(){
        let { metric, isForm, display } = this.props,
            displayScores;

        if (isForm){
            displayScores = _.filter(metric.values, (score) => {return !score.final;});
        } else if (display === 'all') {
            displayScores = metric.values;
        } else if (display === 'final') {
            displayScores = _.filter(metric.values, (score) => {return score.final;});
        }

        return (
            <div className='score-row'>
            {_.map(displayScores, (score) => {
                return <ScoreDisplay key={score.id} score={score} />;
            })}
            </div>
        );
    }

    renderScoreForm(){
        let formScore = _.findWhere(this.props.metric.values, {final: true});
        return <ScoreForm ref='form' score={formScore} />;
    }

    render(){
        let { metric, isForm } = this.props;

        return (
            <div className='metric-display'>
                <h4>{metric.key}</h4>
                <span dangerouslySetInnerHTML={{
                    __html: metric.values[0].metric.description,
                }} />
                {(isForm && !isForm.final) ? null : this.renderScoreRow()}
                {isForm ? this.renderScoreForm() : null}
            </div>
        );
    }
}

MetricDisplay.propTypes = {
    metric: PropTypes.shape({
        key: PropTypes.string.isRequired,
        values: PropTypes.arrayOf(
            PropTypes.shape({
                domain_id: PropTypes.number,
                domain_text: PropTypes.string,
                metric: PropTypes.shape({
                    description: PropTypes.string.isRequired,
                    metric: PropTypes.string.isRequired,
                }).isRequired,
                notes: PropTypes.string.isRequired,
                score_description: PropTypes.string.isRequired,
                score_symbol: PropTypes.string.isRequired,
                score_shade: PropTypes.string.isRequired,
            }).isRequired
        ).isRequired,
    }).isRequired,
    isForm: PropTypes.object,
    display: PropTypes.string,
};

export default MetricDisplay;
