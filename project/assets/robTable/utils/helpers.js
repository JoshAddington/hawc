import _ from 'underscore';
import moment from 'moment';


const helpers = {
    noop(){
    },
    fetchGet: {
        credentials: 'same-origin',
    },
    fetchPost(csrf, obj, verb='PATCH'){
        obj['csrfmiddlewaretoken'] = csrf;
        return {
            credentials: 'same-origin',
            method: verb,
            headers: new Headers({
                'X-CSRFToken': csrf,
                'content-type': 'application/json',
            }),
            body: JSON.stringify(obj),
        };
    },
    getValue(target){
        switch(target.type){
        case 'checkbox':
            return target.checked;
        case 'number':
            return parseFloat(target.value);
        case 'select-one':  // use isFinite in-case value is 0
            let val = parseInt(target.value);
            return (_.isFinite(val)) ? val : target.value;
        case 'text':
        case 'textarea':
        default:
            return target.value;
        }
    },
    getObjectURL(host, base, id){
        return `${host}${base}${id}/`;
    },
    datetimeFormat(dt){
        return moment(dt).format('MMMM Do YYYY, h:mm:ss a');
    },
    getInputDivClass(name, errors, extra=[]){
        extra.push('form-group');
        if (errors && errors[name]) extra.push('has-error');
        return extra.join(' ');
    },
    deepCopy(object){
        return JSON.parse(JSON.stringify(object));
    },
};

export default helpers;
