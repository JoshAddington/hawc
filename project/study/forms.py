from django import forms
from django.core.urlresolvers import reverse
from django.forms.fields import TextInput

from assessment.models import Assessment
from lit.models import Reference
from utils.forms import BaseFormHelper
from . import models


class BaseStudyForm(forms.ModelForm):
    """
    Base form
    """
    class Meta:
        model = models.Study
        fields = ('short_citation', 'study_identifier',
                  'full_citation', 'study_type',
                  'coi_reported', 'coi_details',
                  'funding_source', 'full_text_url',
                  'contact_author', 'ask_author',
                  'summary', 'published')

    def __init__(self, *args, **kwargs):
        parent = kwargs.pop('parent', None)
        super(BaseStudyForm, self).__init__(*args, **kwargs)
        if type(parent) is Assessment:
            self.instance.assessment = parent
        elif type(parent) is Reference:
            self.instance.reference_ptr = parent

        self.helper = self.setHelper()

    def setHelper(self, inputs={}):
        for fld in ('full_citation', 'coi_details', 'funding_source', 'ask_author'):
            self.fields[fld].widget.attrs['rows'] = 3
        for fld in self.fields.keys():
            widget = self.fields[fld].widget
            if type(widget) != forms.CheckboxInput:
                widget.attrs['class'] = 'span12'
            else:
                widget.attrs['class'] = 'checkbox'

        helper = BaseFormHelper(self, **inputs)
        helper.form_class = None
        if 'authors' in self.fields:
            helper.add_fluid_row('authors', 2, "span6")
        helper.add_fluid_row('short_citation', 2, "span6")
        helper.add_fluid_row('coi_reported', 2, "span6")
        helper.add_fluid_row('contact_author', 2, "span6")
        return helper


class StudyForm(BaseStudyForm):
    """
    Study form used for study-updates
    """
    def setHelper(self):
        inputs = {
            "legend_text": u"Update an existing study",
            "help_text": u"",
            "cancel_url": reverse('study:detail', args=[self.instance.id])
        }
        return super(StudyForm, self).setHelper(inputs)


class NewStudyFromReferenceForm(BaseStudyForm):
    """
    Form to create a new Study from an existing reference.
    """
    def setHelper(self):
        inputs = {
            "legend_text": u"Create a new study from an existing reference",
            "help_text": u"",
            "cancel_url": reverse('lit:ref_list_extract', args=[self.instance.reference_ptr.assessment.id])
        }
        return super(NewStudyFromReferenceForm, self).setHelper(inputs)


class ReferenceStudyForm(BaseStudyForm):
    """
    Form to create both a Reference and Study at the same-time.
    """
    class Meta:
        model = models.Study
        fields = ('short_citation', 'study_identifier',
                  'full_citation',
                  'title', 'authors', 'journal',
                  'abstract', 'study_type',
                  'coi_reported', 'coi_details',
                  'funding_source', 'full_text_url',
                  'contact_author', 'ask_author',
                  'summary', 'published')

    def setHelper(self):
        self.fields['title'].widget = TextInput()
        self.fields['authors'].widget = TextInput()
        self.fields['journal'].widget = TextInput()
        self.fields['abstract'].widget.attrs['rows'] = 3
        inputs = {
            "legend_text": u"Create a new study",
            "help_text": u"",
            "cancel_url": reverse('study:list', args=[self.instance.assessment.id])
        }
        return super(ReferenceStudyForm, self).setHelper(inputs)


class AttachmentForm(forms.ModelForm):
    class Meta:
        model = models.Attachment
        fields = ('attachment', )

    def __init__(self, *args, **kwargs):
        study = kwargs.pop('parent', None)
        super(AttachmentForm, self).__init__(*args, **kwargs)
        if study:
            self.instance.study = study


class StudiesCopy(forms.Form):
    # TODO: remove study-type restriction

    HELP_TEXT = """
    Clone multiple studies and move from one assessment to  another assessment.
    Clones are complete and include most nested data.  Cloned studies do not
    include risk of bias information.
    """

    studies = forms.ModelMultipleChoiceField(
        queryset=models.Study.objects.all(),
        help_text="Select studies to copy (for now, epi-only).")
    assessment = forms.ModelChoiceField(
        queryset=Assessment.objects.all(),
        help_text="Select assessment you wish to copy these studies to.")

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        assessment = kwargs.pop('assessment')
        super(StudiesCopy, self).__init__(*args, **kwargs)
        self.fields['assessment'].queryset = self.fields['assessment']\
            .queryset.model.get_editable_assessments(user, assessment.id)
        self.fields['studies'].queryset = self.fields['studies']\
            .queryset.filter(assessment_id=assessment.id, study_type=1)
        self.helper = self.setHelper(assessment)

    def setHelper(self, assessment):
        self.fields['studies'].widget.attrs['size'] = 15
        for fld in self.fields.keys():
            self.fields[fld].widget.attrs['class'] = 'span12'

        inputs = {
            "legend_text": "Copy studies across assessments",
            "help_text": self.HELP_TEXT,
            "cancel_url": reverse("study:list", args=[assessment.id]),
        }

        helper = BaseFormHelper(self, **inputs)
        helper.form_class = None
        return helper
