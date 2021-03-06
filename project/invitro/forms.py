import json
from django import forms
from django.core.urlresolvers import reverse
from django.forms.models import \
    BaseModelFormSet, modelformset_factory, inlineformset_factory
from django.forms.widgets import Select
from selectable import forms as selectable

from assessment.lookups import EffectTagLookup
from utils.forms import BaseFormHelper

from . import models


class IVChemicalForm(forms.ModelForm):
    HELP_TEXT_CREATE = "Describes the chemical used in the current experiment."
    HELP_TEXT_UPDATE = "Update an existing chemical."

    class Meta:
        model = models.IVChemical
        exclude = ('study', )

    def __init__(self, *args, **kwargs):
        study = kwargs.pop('parent', None)
        super(IVChemicalForm, self).__init__(*args, **kwargs)
        if study:
            self.instance.study = study
        self.helper = self.setHelper()

    def setHelper(self):
        for fld in self.fields.keys():
            widget = self.fields[fld].widget
            if type(widget) != forms.CheckboxInput:
                widget.attrs['class'] = 'span12'
            if type(widget) == forms.Textarea:
                widget.attrs['rows'] = 3

        if self.instance.id:
            inputs = {
                'legend_text': u'Update {}'.format(self.instance),
                'help_text': self.HELP_TEXT_UPDATE,
                'cancel_url': self.instance.get_absolute_url()
            }
        else:
            inputs = {
                'legend_text': u'Create new experimental chemical',
                'help_text': self.HELP_TEXT_CREATE,
                'cancel_url': self.instance.study.get_absolute_url()
            }

        helper = BaseFormHelper(self, **inputs)
        helper.form_class = None
        helper.add_fluid_row('name', 3, 'span4')
        helper.add_fluid_row('source', 3, 'span4')
        helper.add_fluid_row('purity_confirmed_notes', 2, 'span6')

        return helper


class IVCellTypeForm(forms.ModelForm):
    HELP_TEXT_CREATE = "Describes the cell type used in the current experiment."
    HELP_TEXT_UPDATE = "Update an existing cell type."

    class Meta:
        model = models.IVCellType
        exclude = ('study', )

    def __init__(self, *args, **kwargs):
        study = kwargs.pop('parent', None)
        super(IVCellTypeForm, self).__init__(*args, **kwargs)
        if study:
            self.instance.study = study
        self.helper = self.setHelper()

    def setHelper(self):
        for fld in self.fields.keys():
            widget = self.fields[fld].widget
            if type(widget) != forms.CheckboxInput:
                widget.attrs['class'] = 'span12'
            if type(widget) == forms.Textarea:
                widget.attrs['rows'] = 3

        if self.instance.id:
            inputs = {
                'legend_text': u'Update {}'.format(self.instance),
                'help_text': self.HELP_TEXT_UPDATE,
                'cancel_url': self.instance.get_absolute_url()
            }
        else:
            inputs = {
                'legend_text': u'Create new cell type',
                'help_text': self.HELP_TEXT_CREATE,
                'cancel_url': self.instance.study.get_absolute_url()
            }

        helper = BaseFormHelper(self, **inputs)
        helper.form_class = None
        helper.add_fluid_row('species', 3, 'span4')
        helper.add_fluid_row('cell_type', 2, 'span6')
        helper.add_fluid_row('tissue', 2, 'span6')

        return helper


class IVExperimentForm(forms.ModelForm):

    HELP_TEXT_CREATE = ""
    HELP_TEXT_UPDATE = "Update an existing experiment."

    class Meta:
        model = models.IVExperiment
        exclude = ('study', )

    def __init__(self, *args, **kwargs):
        study = kwargs.pop('parent', None)
        super(IVExperimentForm, self).__init__(*args, **kwargs)
        if study:
            self.instance.study = study
        self.fields['cell_type'].queryset = \
            self.fields['cell_type'].queryset\
                .filter(study=self.instance.study)
        self.helper = self.setHelper()

    def setHelper(self):
        for fld in self.fields.keys():
            widget = self.fields[fld].widget
            if type(widget) != forms.CheckboxInput:
                widget.attrs['class'] = 'span12'
            if type(widget) == forms.Textarea:
                widget.attrs['rows'] = 3

        if self.instance.id:
            inputs = {
                'legend_text': u'Update {}'.format(self.instance),
                'help_text': self.HELP_TEXT_UPDATE,
                'cancel_url': self.instance.get_absolute_url()
            }
        else:
            inputs = {
                'legend_text': u'Create new experiment',
                'help_text': self.HELP_TEXT_CREATE,
                'cancel_url': self.instance.study.get_absolute_url()
            }

        helper = BaseFormHelper(self, **inputs)
        helper.form_class = None
        helper.add_fluid_row('name', 2, 'span6')
        helper.add_fluid_row('transfection', 2, 'span6')
        helper.add_fluid_row('dosing_notes', 2, 'span6')
        helper.add_fluid_row('has_positive_control', 2, 'span6')
        helper.add_fluid_row('has_negative_control', 2, 'span6')
        helper.add_fluid_row('has_vehicle_control', 2, 'span6')
        helper.add_fluid_row('control_notes', 2, 'span6')

        return helper


class CategoryModelChoice(forms.ModelChoiceField):

    def label_from_instance(self, obj):
        return obj.choice_label


class OELWidget(Select):

    def set_default_choices(self, instance):
        choices = [
            (-999, '---'),
        ]

        if instance.id:
            for eg in instance.groups.all():
                choices.append((eg.dose_group_id, eg.dose))

        self.choices = choices


class IVEndpointForm(forms.ModelForm):

    HELP_TEXT_CREATE = ""
    HELP_TEXT_UPDATE = "Update an existing endpoint."

    category = CategoryModelChoice(
        required=False,
        queryset=models.IVEndpointCategory.objects.none())

    class Meta:
        model = models.IVEndpoint
        exclude = (
            'assessment', 'experiment',
        )
        widgets = {
            'NOEL': OELWidget(),
            'LOEL': OELWidget(),
        }

    def __init__(self, *args, **kwargs):
        experiment = kwargs.pop('parent', None)
        assessment = kwargs.pop('assessment', None)
        super(IVEndpointForm, self).__init__(*args, **kwargs)
        if experiment:
            self.instance.experiment = experiment
        if assessment:
            self.instance.assessment = assessment

        self.fields['NOEL'].widget.set_default_choices(self.instance)
        self.fields['LOEL'].widget.set_default_choices(self.instance)

        self.fields['effects'].widget = selectable.AutoCompleteSelectMultipleWidget(
            lookup_class=EffectTagLookup)
        self.fields['effects'].help_text = 'Tags used to help categorize effect description.'

        self.fields['chemical'].queryset = \
            self.fields['chemical'].queryset\
                .filter(study=self.instance.experiment.study)

        self.fields['category'].queryset = \
            self.fields['category'].queryset.model\
                .get_assessment_qs(self.instance.assessment.id)

        self.helper = self.setHelper()

    def clean_additional_fields(self):
        data = self.cleaned_data['additional_fields']
        try:
            json.loads(data)
        except ValueError:
            raise forms.ValidationError("Must be valid JSON.")
        return data

    def setHelper(self):
        for fld in self.fields.keys():
            widget = self.fields[fld].widget
            if type(widget) != forms.CheckboxInput:
                if fld in ['effects']:
                    widget.attrs['class'] = 'span10'
                else:
                    widget.attrs['class'] = 'span12'

            if type(widget) == forms.Textarea:
                widget.attrs['rows'] = 3

        if self.instance.id:
            inputs = {
                'legend_text': u'Update {}'.format(self.instance),
                'help_text': self.HELP_TEXT_UPDATE,
                'cancel_url': self.instance.get_absolute_url()
            }
        else:
            inputs = {
                'legend_text': u'Create new endpoint',
                'help_text': self.HELP_TEXT_CREATE,
                'cancel_url': self.instance.experiment.get_absolute_url()
            }

        helper = BaseFormHelper(self, **inputs)
        helper.form_class = None
        helper.add_fluid_row('name', 2, 'span6')
        helper.add_fluid_row('chemical', 2, 'span6')
        helper.add_fluid_row('assay_type', 2, 'span6')
        helper.add_fluid_row('effect', 2, 'span6')
        helper.add_fluid_row('data_type', 4, 'span3')
        helper.add_fluid_row('observation_time', 4, 'span3')
        helper.add_fluid_row('monotonicity', 3, 'span4')
        helper.add_fluid_row('trend_test', 2, 'span6')
        helper.add_fluid_row('endpoint_notes', 2, 'span6')

        url = reverse(
            'assessment:effect_tag_create',
            kwargs={'pk': self.instance.assessment_id}
        )
        helper.addBtnLayout(helper.layout[2], 1, url, 'Add new effect tag', 'span6')

        return helper


class IVEndpointGroupForm(forms.ModelForm):

    class Meta:
        model = models.IVEndpointGroup
        exclude = ('endpoint', 'dose_group_id')

    def __init__(self, *args, **kwargs):
        super(IVEndpointGroupForm, self).__init__(*args, **kwargs)
        self.fields['dose'].widget.attrs['class'] = 'doses'


class BaseIVEndpointGroupFormset(BaseModelFormSet):
    pass


IVEndpointGroupFormset = modelformset_factory(
    models.IVEndpointGroup,
    form=IVEndpointGroupForm,
    formset=BaseIVEndpointGroupFormset,
    can_delete=True,
    extra=0)

BlankIVEndpointGroupFormset = modelformset_factory(
    models.IVEndpointGroup,
    form=IVEndpointGroupForm,
    formset=BaseIVEndpointGroupFormset,
    can_delete=True,
    extra=1)


class BaseIVBenchmarkForm(forms.ModelForm):

    class Meta:
        model = models.IVBenchmark
        fields = '__all__'


IVBenchmarkFormset = inlineformset_factory(
    models.IVEndpoint,
    models.IVBenchmark,
    form=BaseIVBenchmarkForm,
    extra=1)
