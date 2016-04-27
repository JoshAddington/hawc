from django.conf.urls import url, include

from rest_framework.routers import DefaultRouter

from . import views, api

urlpatterns = [
    url(r'^assessment/(?P<pk>\d+)/studies/$',
        views.ARobList.as_view(),
        name='list'),
    # assessment risk-of-bias
    url(r'^assessment/(?P<pk>\d+)/$',
        views.ARoBDetail.as_view(),
        name='arob_detail'),
    url(r'^assessment/(?P<pk>\d+)/edit/$',
        views.ARoBEdit.as_view(),
        name='arob_update'),
    url(r'^assessment/(?P<pk>\d+)/report/$',
        views.StudyRoBExport.as_view(),
        name='bias_export'),
    url(r'^assessment/(?P<pk>\d+)/fixed-report/$',
        views.RoBFixedReport.as_view(),
        name='rob_fixedreport'),

    url(r'^assessment/(?P<pk>\d+)/reviewers/$',
        views.ARoBReviewersList.as_view(),
        name='arob_reviewers'),
    url(r'^assessment/(?P<pk>\d+)/reviewers/create/$',
        views.ARoBReviewersCreate.as_view(),
        name='arob_reviewers_create'),
    url(r'^assessment/(?P<pk>\d+)/reviewers/edit/$',
        views.ARoBReviewersUpdate.as_view(),
        name='arob_reviewers_update'),

    url(r'^assessment/(?P<pk>\d+)/domain/create/$',
        views.RoBDomainCreate.as_view(),
        name='robd_create'),
    url(r'^domain/(?P<pk>\d+)/edit/$',
        views.RoBDomainUpdate.as_view(),
        name='robd_update'),
    url(r'^domain/(?P<pk>\d+)/delete/$',
        views.RoBDomainDelete.as_view(),
        name='robd_delete'),

    url(r'^domain/(?P<pk>\d+)/metric/create/$',
        views.RoBMetricCreate.as_view(),
        name='robm_create'),
    url(r'^metric/(?P<pk>\d+)/edit/$',
        views.RoBMetricUpdate.as_view(),
        name='robm_update'),
    url(r'^metric/(?P<pk>\d+)/delete/$',
        views.RoBMetricDelete.as_view(),
        name='robm_delete'),

    # risk-of-bias at study-level
    url(r'^study/(?P<pk>\d+)/$',
        views.RoBsDetail.as_view(),
        name='robs_detail'),
    url(r'^study/(?P<pk>\d+)/all/$',
        views.RoBsDetailAll.as_view(),
        name='robs_detail_all'),
    url(r'^study/(?P<pk>\d+)/list/$',
        views.RoBsList.as_view(),
        name='robs_list'),
    url(r'^study/(?P<pk>\d+)/create/$',
        views.RoBsCreate.as_view(),
        name='robs_new'),
    url(r'^study/(?P<pk>\d+)/edit/$',
        views.RoBsEdit.as_view(),
        name='robs_update'),
    url(r'^study/(?P<pk>\d+)/delete/$',
        views.RoBsDelete.as_view(),
        name='robs_delete'),

    # risk-of-bias
    url(r'^(?P<slug>[\w-]+)/(?P<pk>\d+)/create/',
        views.RoBCreate.as_view(),
        name='rob_create'),
    url(r'^(?P<pk>\d+)/edit/$',
        views.RoBEdit.as_view(),
        name='rob_update'),
    url(r'^(?P<pk>\d+)/delete/$',
        views.RoBDelete.as_view(),
        name='rob_delete'),
]