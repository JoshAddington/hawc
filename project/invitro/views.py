from assessment.models import Assessment
from utils.views import (
    GenerateReport, BaseList, BaseDetail, BaseCreate,
    BaseUpdate, BaseDelete, BaseUpdateWithFormset, BaseCreateWithFormset,
)

from study.models import Study
from . import models, forms, exports


# Experiment
class ExperimentCreate(BaseCreate):
    success_message = "Experiment created."
    parent_model = Study
    parent_template_name = 'study'
    model = models.IVExperiment
    form_class = forms.IVExperimentForm


class ExperimentDetail(BaseDetail):
    model = models.IVExperiment


class ExperimentUpdate(BaseUpdate):
    success_message = "Experiment updated."
    model = models.IVExperiment
    form_class = forms.IVExperimentForm


class ExperimentDelete(BaseDelete):
    success_message = "Experiment deleted."
    model = models.IVExperiment

    def get_success_url(self):
        return self.object.study.get_absolute_url()


# Chemical
class ChemicalCreate(BaseCreate):
    success_message = "Chemical created."
    parent_model = Study
    parent_template_name = 'study'
    model = models.IVChemical
    form_class = forms.IVChemicalForm


class ChemicalDetail(BaseDetail):
    model = models.IVChemical


class ChemicalUpdate(BaseUpdate):
    success_message = "Chemical updated."
    model = models.IVChemical
    form_class = forms.IVChemicalForm


class ChemicalDelete(BaseDelete):
    success_message = "Chemical deleted."
    model = models.IVChemical

    def get_success_url(self):
        return self.object.study.get_absolute_url()


# Cell type
class CellTypeCreate(BaseCreate):
    success_message = "Cell-type created."
    parent_model = Study
    parent_template_name = 'study'
    model = models.IVCellType
    form_class = forms.IVCellTypeForm


class CellTypeDetail(BaseDetail):
    model = models.IVCellType


class CellTypeUpdate(BaseUpdate):
    success_message = "Cell-type updated."
    model = models.IVCellType
    form_class = forms.IVCellTypeForm


class CellTypeDelete(BaseDelete):
    success_message = "Cell-type deleted."
    model = models.IVCellType

    def get_success_url(self):
        return self.object.study.get_absolute_url()


# Endpoint
class EndpointCreate(BaseCreateWithFormset):
    success_message = 'Endpoint created.'
    parent_model = models.IVExperiment
    parent_template_name = 'experiment'
    model = models.IVEndpoint
    form_class = forms.IVEndpointForm
    formset_factory = forms.IVEndpointGroupFormset

    def get_form_kwargs(self):
        kwargs = super(EndpointCreate, self).get_form_kwargs()
        kwargs['assessment'] = self.assessment
        return kwargs

    def post_object_save(self, form, formset):
        dose_group_id = 0
        for form in formset.forms:
            if form in formset.extra_forms and not form.has_changed():
                continue  # skip unused extra forms in formset
            form.instance.endpoint = self.object
            if form.is_valid() and form not in formset.deleted_forms:
                form.instance.dose_group_id = dose_group_id
                if form.has_changed() is False:
                    form.instance.save()  # ensure new dose_group_id saved to db
                dose_group_id += 1

    def build_initial_formset_factory(self):
        return forms.BlankIVEndpointGroupFormset(
            queryset=models.IVEndpointGroup.objects.none())


class EndpointDetail(BaseDetail):
    model = models.IVEndpoint


class EndpointUpdate(BaseUpdateWithFormset):
    success_message = "Endpoint updated."
    model = models.IVEndpoint
    form_class = forms.IVEndpointForm
    formset_factory = forms.IVEndpointGroupFormset

    def build_initial_formset_factory(self):
            # make sure at least one group exists; we check because it's
            # possible to delete as well as create objects in this view.
            qs = self.object.groups.all().order_by('dose_group_id')
            fs = forms.IVEndpointGroupFormset(queryset=qs)
            if qs.count() == 0:
                fs.extra = 1
            return fs

    def post_object_save(self, form, formset):
        dose_group_id = 0
        for form in formset.forms:
            if form in formset.extra_forms and not form.has_changed():
                continue  # skip unused extra forms in formset
            form.instance.endpoint = self.object
            if form.is_valid() and form not in formset.deleted_forms:
                form.instance.dose_group_id = dose_group_id
                if form.has_changed() is False:
                    form.instance.save()  # ensure new dose_group_id saved to db
                dose_group_id += 1

        benchmark_formset = forms.IVBenchmarkFormset(self.request.POST, instance=self.object)
        if benchmark_formset.is_valid():
            benchmark_formset.save()

    def get_context_data(self, **kwargs):
        context = super(EndpointUpdate, self).get_context_data(**kwargs)
        context['benchmark_formset'] = forms.IVBenchmarkFormset(instance=self.object)
        return context


class EndpointDelete(BaseDelete):
    success_message = "Endpoint deleted."
    model = models.IVEndpoint

    def get_success_url(self):
        return self.object.experiment.get_absolute_url()


class EndpointsList(BaseList):
    parent_model = Assessment
    model = models.IVEndpoint

    def get_paginate_by(self, qs):
        val = 25
        try:
            val = int(self.request.GET.get('paginate_by', val))
        except ValueError:
            pass
        return val

    def get_queryset(self):
        filters = {"assessment": self.assessment}
        perms = super(EndpointsList, self).get_obj_perms()
        if not perms['edit']:
            filters["experiment__study__published"] = True
        return self.model.objects.filter(**filters).order_by('name')


class EndpointsFullExport(EndpointsList):
    parent_model = Assessment
    model = models.IVEndpoint

    def get(self, request, *args, **kwargs):
        self.object_list = self.get_queryset()
        export_format = request.GET.get("output", "excel")
        exporter = exports.DataPivotEndpoint(
            self.object_list,
            export_format=export_format,
            filename='{}-invitro'.format(self.assessment))
        return exporter.build_response()


class EndpointsReport(GenerateReport):
    parent_model = Assessment
    model = models.IVEndpoint
    report_type = 5

    def get_queryset(self):
        filters = {"assessment": self.assessment}
        perms = super(EndpointsReport, self).get_obj_perms()
        if not perms['edit'] or self.onlyPublished:
            filters["experiment__study__published"] = True
        return self.model.objects.filter(**filters)

    def get_filename(self):
        return "in-vitro.docx"

    def get_context(self, queryset):
        return self.model.get_docx_template_context(queryset)
