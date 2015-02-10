from study.models import Study
from utils.helper import FlatFileExporter
from . import models

from copy import copy


class EndpointFlatComplete(FlatFileExporter):
    """
    Returns a complete export of all data required to rebuild the the
    animal bioassay study type from scratch.
    """

    def _get_header_row(self):
        self.doses = models.DoseUnits.doses_in_assessment(self.kwargs.get('assessment'))

        header = []
        header.extend(Study.flat_complete_header_row())
        header.extend(models.Experiment.flat_complete_header_row())
        header.extend(models.AnimalGroup.flat_complete_header_row())
        header.extend(models.DosingRegime.flat_complete_header_row())
        header.extend(models.Endpoint.flat_complete_header_row())
        header.extend([u'doses-{}'.format(d) for d in self.doses])
        header.extend(models.EndpointGroup.flat_complete_header_row())
        return header

    def _get_data_rows(self):
        rows = []
        for obj in self.queryset:
            ser = obj.get_json(json_encode=False)
            row = []
            row.extend(Study.flat_complete_data_row(ser['animal_group']['experiment']['study']))
            row.extend(models.Experiment.flat_complete_data_row(ser['animal_group']['experiment']))
            row.extend(models.AnimalGroup.flat_complete_data_row(ser['animal_group']))
            row.extend(models.DosingRegime.flat_complete_data_row(ser['animal_group']['dosing_regime']))
            row.extend(models.Endpoint.flat_complete_data_row(ser))
            for i, eg in enumerate(ser['endpoint_group']):
                row_copy = copy(row)
                row_copy.extend(models.DoseGroup.flat_complete_data_row(
                    ser['animal_group']['dosing_regime']['doses'],
                    self.doses, i))
                row_copy.extend(models.EndpointGroup.flat_complete_data_row(eg, ser))
                rows.append(row_copy)

        return rows


class EndpointFlatDataPivot(FlatFileExporter):
    """
    Return a subset of frequently-used data for generation of data-pivot
    visualizations.
    """

    def _get_header_row(self):
        return [
            'study',
            'study_url',
            'Study HAWC ID',
            'Study Published',

            'experiment',
            'experiment_url',

            'animal_group',
            'animal_group_url',
            'lifestage exposed',
            'lifestage assessed',

            'endpoint_name',
            'endpoint_url',
            'data_type',
            'doses',
            'dose_units',
            'response_units',
            'Endpoint Key',

            'low_dose',
            'NOAEL',
            'LOAEL',
            'FEL',
            'high_dose',

            'BMD model name',
            'BMDL',
            'BMD',
            'BMDU',
            'CSF',

            'Row Key',
            'dose_index',
            'dose',
            'n',
            'incidence',
            'response',
            'stdev',
            'percentControlMean',
            'percentControlLow',
            'percentControlHigh'
        ]


    def _get_data_rows(self):

        units = self.kwargs.get('dose', None)

        def get_doses_list(ser):
            # compact the dose-list to only one set of dose-units; using the
            # selected dose-units if specified, else others
            if units:
                units_id = units.id
            else:
                units_id = ser['animal_group']['dosing_regime']['doses'][0]['dose_units']['id']
            return [ d for d in ser['animal_group']['dosing_regime']['doses'] if units_id == d['dose_units']['id'] ]

        def get_dose_units(doses):
            return doses[0]['dose_units']['units']

        def get_doses_str(doses):
            values = u', '.join([ str(float(d['dose'])) for d in doses ])
            return u"{0} {1}".format(values, get_dose_units(doses))

        def get_dose(doses, idx):
            for dose in doses:
                if dose['dose_group_id'] == idx:
                    return float(dose['dose'])
            return None

        rows = []
        for obj in self.queryset:
            ser = obj.get_json(json_encode=False)
            doses = get_doses_list(ser)

            # build endpoint-group independent data
            row = [
                ser['animal_group']['experiment']['study']['short_citation'],
                ser['animal_group']['experiment']['study']['url'],
                ser['animal_group']['experiment']['study']['id'],
                ser['animal_group']['experiment']['study']['published'],

                ser['animal_group']['experiment']['name'],
                ser['animal_group']['experiment']['url'],

                ser['animal_group']['name'],
                ser['animal_group']['url'],
                ser['animal_group']['lifestage_exposed'],
                ser['animal_group']['lifestage_assessed'],

                ser['name'],
                ser['url'],
                ser['data_type_label'],
                get_doses_str(doses),
                get_dose_units(doses),
                ser['response_units'],
                ser['id']
            ]

            # dose-group specific information
            if len(ser['endpoint_group'])>1:
                row.extend([
                    get_dose(doses, 1),  # first non-zero dose
                    get_dose(doses, ser['NOAEL']),
                    get_dose(doses, ser['LOAEL']),
                    get_dose(doses, ser['FEL']),
                    get_dose(doses, len(ser['endpoint_group'])-1),
                ])
            else:
                row.extend([None]*5)

            # BMD information
            if ser['BMD'] and units and ser['BMD'].has_key('outputs') and ser['BMD']['dose_units_id'] == units.id:
                row.extend([
                    ser['BMD']['outputs']['model_name'],
                    ser['BMD']['outputs']['BMDL'],
                    ser['BMD']['outputs']['BMD'],
                    ser['BMD']['outputs']['BMDU'],
                    ser['BMD']['outputs']['CSF']
                ])
            else:
                row.extend([None]*5)

            # endpoint-group information
            for i, eg in enumerate(ser['endpoint_group']):
                row_copy = copy(row)
                row_copy.extend([
                    eg['id'],
                    eg['dose_group_id'],
                    get_dose(doses, i),
                    eg['n'],
                    eg['incidence'],
                    eg['response'],
                    eg['stdev'],
                    eg['percentControlMean'],
                    eg['percentControlLow'],
                    eg['percentControlHigh']
                ])
                rows.append(row_copy)

        return rows