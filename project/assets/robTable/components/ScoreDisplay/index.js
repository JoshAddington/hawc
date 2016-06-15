import React, { Component, PropTypes } from 'react';

import ScoreBar from 'robTable/components/ScoreBar';
import './ScoreDisplay.css';


class ScoreDisplay extends Component {

    componentDidMount() {
        console.log('this', this.refs.display.offsetWidth);
    }

    render(){
        let { score } = this.props;
        return (
            <div className='score-display flexrow-container' ref='display'>
                <div className='flex-1'>
                    <h5>{score.author.full_name}</h5>
                    <ScoreBar score={score.score}
                              shade={score.score_shade}
                              symbol={score.score_symbol}
                              description={score.score_description}
                    />
                </div>
                <div className='flex-3' dangerouslySetInnerHTML={{
                    __html: score.notes,
                }}></div>
            </div>
        );
    }
}

ScoreDisplay.propTypes = {
    score: PropTypes.shape({
        author: PropTypes.object.isRequired,
        domain_id: PropTypes.number,
        domain_text: PropTypes.string,
        metric: PropTypes.shape({
            description: PropTypes.string.isRequired,
            metric: PropTypes.string.isRequired,
        }).isRequired,
        notes: PropTypes.string,
        score_description: PropTypes.string.isRequired,
        score_symbol: PropTypes.string.isRequired,
        score_shade: PropTypes.string.isRequired,
    }).isRequired,
};

export default ScoreDisplay;
