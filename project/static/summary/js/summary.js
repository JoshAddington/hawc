var SummaryTextTree = function(options){
    var self = this;
    this.options = options;
    this.root = undefined;
    this.get_summaries();
};
SummaryTextTree.prototype = {
    get_summaries: function(){
        var self = this,
            url = SummaryText.assessment_list_url(this.options.assessment_id);
        $.get(url, function(d){
            self.root = new SummaryText(d[0], 1, self, 0);
            if((self.root.data.comments) && (self.root.data.comments.length>0)){
                self._unpack_comments();
            }
            if(self.options.mode=="read"){
                self._update_read();
            } else if (self.options.mode==="modify"){
                self._update_modified();
            }
        });
    },
    _update_read: function(){
        this.render_docheaders();
        this.render_doctext();
        this.enable_affix();
        this._setSmartTags();
    },
    _unpack_comments: function(){
        _.each(this.root.data.comments, function(d){
            this.root._add_comment(d);
        }, this);
    },
    _update_modified: function(){
        this.options.update_textdiv.fadeOut();
        this.render_doctree();
        this.set_modify_events();
    },
    render_docheaders: function(){
        var contents = [], txt;
        if (this.root.children.length===0){
            txt = '<li><a href="#"><i>No summary-text is available.</i></a></li>';
            contents.push(txt);
        } else {
            _.each(this.root.children, function(d){
                d.render_header(contents);
            });
        }
        this.options.read_headers_ul.html(contents);
    },
    render_doctext: function(){
        var contents = [];
        if (this.root.children.length===0){
            contents.push('<p>No summary-text is available.</p>');
        } else {
            this.root.children.forEach(function(v){
                v.render_body(contents);
            });
        }
        this.options.read_text_div.html(contents);
    },
    update_textdiv: function(obj){
        this.selected = obj;
        var self = this,
            isNew = (obj===undefined),
            parent_options = function(){
                var lst = [],
                    select = self.options.update_textdiv.find('select#id_parent');
                self.root.get_option_item(lst);
                select.html(lst);
                if(!isNew){
                    select.find('option[value="{0}"]'.printf(obj.parent.id)).prop('selected', true);
                }
            }, sibling_options = function(){
                var select = self.options.update_textdiv.find('select#id_sibling'),
                    text_node_id = parseInt(self.options.update_textdiv.find('select#id_parent option:selected').val(), 10),
                    lst =['<option value="">(none)</option>'],
                    parent = self.get_summarytext_node(text_node_id);
                parent.get_children_option_items(lst);
                select.html(lst);
                if(!isNew){
                    select.find('option[value="{0}"]'.printf(obj.get_prior_sibling_id())).prop('selected', true);
                }
            }, load_contents = function(){

                if (obj){
                    self.options.update_textdiv.find('#id_title').val(obj.data.title);
                    self.options.update_textdiv.find('#id_slug').val(obj.data.slug);
                    self.options.text_editor.setContent(obj.data.text);
                    self.options.update_textdiv.find('#id_text').val(obj.data.text);
                } else {
                    self.options.update_textdiv.find('#id_title').val("");
                    self.options.update_textdiv.find('#id_slug').val("");
                    self.options.text_editor.setContent("");
                }
            },
            toggleEditOptions = function(isNew){
                var sel = self.options.update_textdiv.find("#deleteSTBtn");
                (isNew) ? sel.hide() : sel.show();
            };

        load_contents();
        toggleEditOptions();
        parent_options();
        sibling_options();
        self.options.update_textdiv.fadeIn();
        self.options.update_textdiv.find('select#id_parent')
            .on('change', function(){sibling_options(obj, isNew);});
    },
    set_modify_events: function(){
        var self = this;

        this.options.update_new
            .unbind()
            .on('click', function(){self.update_textdiv();});

        this.options.update_textdiv.find('form')
            .unbind()
            .submit(function(e){
                e.preventDefault();
                self.submit();
            });

        this.options.update_delete
            .unbind()
            .on('click', function(){
                var url = SummaryText.delete_url(self.selected.id);
                $.post(url, $.proxy(self._redraw, self));
            });

        this.options.update_doctree
            .unbind()
            .on('click', '.summary_toc', function(){
                self.update_textdiv($(this).data('d'));
            });
    },
    render_doctree: function(){
        var contents=[];
        if (this.root.children.length===0){
            contents.push('<p><i>No contents.</i></p>');
        } else {
            this.root.children.forEach(function(v){
                v.render_tree(contents);
            });
        }
        this.options.update_doctree.html(contents);
    },
    get_summarytext_node: function(id){
        var node,
            get_id = function(st, id){
                if(st.id===id){node = st; return;}
                st.children.forEach(function(v){get_id(v, id);});
            };

        get_id(this.root, id);
        return node;
    },
    submit: function(){
        this.options.text_editor.prepareSubmission();
        var form = this.options.update_textdiv.find('form'),
            data = form.serialize(),
            url = '.';
        if (this.selected && this.selected.id){
            url = SummaryText.update_url(this.selected.id);
        }
        $.post(url, data, $.proxy(this._redraw, this));
        return false;
    },
    _redraw: function(res){
        this.options.update_textdiv.find(".alert").remove();
        if (res.status=="ok"){
            this.root = new SummaryText(res.content[0], 1, this);
            this._update_modified();
        } else {
            HAWCUtils.addAlert(res, this.options.update_textdiv);
        }
    },
    enable_affix: function(){
        $('.affix-sidenav a').click(function(e){
            var href = $(this).attr("href"),
                offsetTop = href === "#" ? 0 : $(href).offset().top-65;
        $('html, body').stop().animate({scrollTop: offsetTop}, 300);
            e.preventDefault();
        });

        $('[data-spy="scroll"]').each(function () {
            var $spy = $(this).scrollspy('refresh');
        });
    },
    _setSmartTags: function(){
        new SmartTagContainer(this.options.read_text_div, {showOnStartup: true});
    }
};


var SummaryText = function(obj, depth, tree, sibling_id, parent){
    this.parent = parent;
    this.tree = tree;
    this.depth = depth;
    this.id = obj.id;
    this.data = obj.data;
    if ((window.comment_module_enabled) && (tree.options.commenting_public || tree.options.commenting_enabled)){
        this.comment_manager = new CommentManager(null, {
            "displayAsTable": false,
            "object_type": "summary_text",
            "object_id": this.id,
            "commenting_public": this.tree.options.commenting_public,
            "commenting_enabled": this.tree.options.commenting_enabled,
            "user": this.tree.options.user,
        }, this);
    }
    this.section_label = (parent) ? (this.parent.section_label +
                                     (sibling_id+1).toString() + ".") : ("");

    var self = this,
        children = [];
    if(obj.children){
        obj.children.forEach(function(child, i){
            children.push(new SummaryText(child, depth+1, tree, i, self));
        });
    }
    this.children = children;
};
_.extend(SummaryText, {
    update_url: function(id){
        return "/summary/{0}/update/".printf(id);
    },
    delete_url: function(id){
        return "/summary/{0}/delete/".printf(id);
    },
    assessment_list_url: function(assessment_id){
        return '/summary/assessment/{0}/summaries/json/'.printf(assessment_id);
    }
});
SummaryText.prototype = {
    get_option_item: function(lst){
        var title = (this.depth===1) ? "(document root)" : this.data.title;
        lst.push($('<option value="{0}">{1}{2}</option>'
                    .printf(this.id, Array(this.depth).join('&nbsp;&nbsp;'), title))
                    .data('d', this));
        this.children.forEach(function(v){v.get_option_item(lst);});
    },
    get_children_option_items: function(lst){
        this.children.forEach(function(v){
            lst.push('<option value="{0}">{1}</option>'.printf(v.id, v.data.title));
        });
    },
    render_tree: function(lst){
        lst.push($('<p class="summary_toc">{0}{1}</p>'.printf(
                                          this.get_tab_depth(),
                                          this.data.title)).data('d', this));
        this.children.forEach(function(v){v.render_tree(lst);});
    },
    get_tab_depth: function(){
        return Array(this.depth-1).join('&nbsp;&nbsp;');
    },
    print_section: function(){

        var div = $('<div id="{0}"></div>'.printf(this.data.slug)),
            header = $('<h{0}>{1} {2}</h{3}>'.printf(this.depth,
                                                     this.section_label,
                                                     this.data.title,
                                                     this.depth)),
            content = $('<div>{0}</div>'.printf(this.data.text));

        if(this.comment_manager){this.comment_manager.add_popup_button(header);}
        return div.append(header, content);
    },
    render_header: function(lst){
        lst.push('<li><a href="#{0}">{1}{2} {3}<i class="icon-chevron-right"></i></a></li>'.printf(
                this.data.slug,
                this.get_tab_depth(),
                this.section_label,
                this.data.title));
        this.children.forEach(function(v){v.render_header(lst);});
    },
    render_body: function(lst){
        lst.push(this.print_section());
        this.children.forEach(function(v){v.render_body(lst);});
    },
    get_prior_sibling_id: function(){
        var self=this,
            result = -1;
        if(this.parent){
            this.parent.children.forEach(function(v, i){
                if (v.id===self.id && i>0){result = self.parent.children[i-1].id;}
            });
        }
        return result;
    },
    _add_comment: function(comment_data){
        if (this.comment_manager && comment_data.parent_object.pk == this.id){
            this.comment_manager.comments.push(new Comment(this.comment_manager, comment_data));
        } else {
            this.children.forEach(function(v){
                v._add_comment(comment_data);
            });
        }
    }
};



var VisualCollection = function(data){
    this.visuals = [];
    for(var i=0; i<data.length; i++){
        this.visuals.push(new Visual(data[i]));
    }
}
_.extend(VisualCollection, {
    buildTable: function(url1, url2, $el){
        var visuals, obj;

        $.when(
           $.get(url1),
           $.get(url2)
        ).done(function(d1, d2) {
            d1[0].push.apply(d1[0], d2[0]);
            visuals = _.sortBy(d1[0], function(d){return d.title;});
        }).fail(function(){
            HAWCUtils.addAlert("Error- unable to fetch visualizations; please contact a HAWC administrator.");
            visuals = [];
        }).always(function(){
            obj = new VisualCollection( visuals );
            return obj.build_table($el);
        });
    }
});
VisualCollection.prototype = {
    build_table: function($el){
        if(this.visuals.length === 0)
            return $el.html("<p><i>No custom-visuals are available for this assessment.</i></p>");

        var tbl = new BaseTable();
        tbl.addHeaderRow(['Title', 'Visual type', 'Description', 'Created', 'Modified']);
        tbl.setColGroup([20, 20, 38, 11, 11]);
        for(var i=0; i<this.visuals.length; i++){
            tbl.addRow(this.visuals[i].build_row());
        };
        $el.html(tbl.getTbl());
        this.setTableSorting($el.find('table'));
        return $el;
    },
    setTableSorting: function($el){
        var name = $el.find('thead tr th')[0];
        name.setAttribute('class', (name.getAttribute('class') || '') + ' sort-default');
        new Tablesort($el[0]);
    },
}


var Visual = function(data){
    this.data = data;
    this.data.created = new Date(this.data.created);
    this.data.last_updated = new Date(this.data.last_updated);
};
_.extend(Visual, {
    get_object: function(id, cb){
        $.get('/summary/api/visual/{0}/'.printf(id), function(d){
            var Cls
            switch (d.visual_type){
                case "animal bioassay endpoint aggregation":
                    Cls = EndpointAggregation;
                    break;
                case "animal bioassay endpoint crossview":
                    Cls = Crossview;
                    break;
                case "risk of bias heatmap":
                    Cls = RoBHeatmap;
                    break;
                case "risk of bias barchart":
                    Cls = RoBBarchart;
                    break;
                default:
                    throw "Error - unknown visualization-type: {0}".printf(d.visual_type);
            }
            cb(new Cls(d));
        });
    },
    displayAsPage: function(id, $el){
        $el.html("<p>Loading... <img src='/static/img/loading.gif'></p>");
        Visual.get_object(id, function(d){d.displayAsPage($el);});
    },
    displayAsModal: function(id, options){
        Visual.get_object(id, function(d){d.displayAsModal(options);});
    }
});
Visual.prototype = {
    build_row: function(){
        return [
            '<a href="{0}">{1}</a>'.printf(this.data.url, this.data.title),
            this.data.visual_type,
            HAWCUtils.truncateChars(this.data.caption),
            this.data.created.toString(),
            this.data.last_updated.toString()
        ];
    },
    displayAsPage: function($el, options){
        throw "Abstract method; requires implementation";
    },
    displayAsModal: function($el, options){
        throw "Abstract method; requires implementation";
    },
    addActionsMenu: function(){
        return HAWCUtils.pageActionsButton([
            'Visualization editing',
            {url: this.data.url_update, text: "Update"},
            {url: this.data.url_delete, text: "Delete"},
        ]);
    },
    object_hyperlink: function(){
        return $('<a>')
            .attr("href", this.data.url)
            .attr("target", "_blank")
            .text(this.data.title);
    }
};


D3Visualization = function(parent, data, options){
    D3Plot.apply(this, arguments);
    this.parent = parent;
    this.data = data;
    this.options = options || {};
    this.settings = {};
};
_.extend(D3Visualization, {
    styles: {
        "lines": [
            {"name": "base",                    "stroke": "#708090", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 3},
            {"name": "reference line",          "stroke": "#000000", "stroke-dasharray": "none",         "stroke-opacity": 0.8, "stroke-width": 2},
            {"name": "transparent",             "stroke": "#000000", "stroke-dasharray": "none",         "stroke-opacity": 0,   "stroke-width": 0},
            {"name": "solid | black",           "stroke": "#000000", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "solid | red",             "stroke": "#e32727", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "solid | green",           "stroke": "#006a1e", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "solid | blue",            "stroke": "#006dbe", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "solid | orange",          "stroke": "#dc8f00", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "solid | purple",          "stroke": "#b82cff", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "solid | fuschia",         "stroke": "#ab006c", "stroke-dasharray": "none",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dashed | black",          "stroke": "#000000", "stroke-dasharray": "10, 10",       "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dashed | red",            "stroke": "#e32727", "stroke-dasharray": "10, 10",       "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dashed | green",          "stroke": "#006a1e", "stroke-dasharray": "10, 10",       "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dashed | blue",           "stroke": "#006dbe", "stroke-dasharray": "10, 10",       "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dashed | orange",         "stroke": "#dc8f00", "stroke-dasharray": "10, 10",       "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dashed | purple",         "stroke": "#b82cff", "stroke-dasharray": "10, 10",       "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dashed | fuschia",        "stroke": "#ab006c", "stroke-dasharray": "10, 10",       "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dotted | black",          "stroke": "#000000", "stroke-dasharray": "2, 3",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dotted | red",            "stroke": "#e32727", "stroke-dasharray": "2, 3",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dotted | green",          "stroke": "#006a1e", "stroke-dasharray": "2, 3",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dotted | blue",           "stroke": "#006dbe", "stroke-dasharray": "2, 3",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dotted | orange",         "stroke": "#dc8f00", "stroke-dasharray": "2, 3",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dotted | purple",         "stroke": "#b82cff", "stroke-dasharray": "2, 3",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dotted | fuschia",        "stroke": "#ab006c", "stroke-dasharray": "2, 3",         "stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dash-dotted | black",     "stroke": "#000000", "stroke-dasharray": "15, 10, 5, 10","stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dash-dotted | red",       "stroke": "#e32727", "stroke-dasharray": "15, 10, 5, 10","stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dash-dotted | green",     "stroke": "#006a1e", "stroke-dasharray": "15, 10, 5, 10","stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dash-dotted | blue",      "stroke": "#006dbe", "stroke-dasharray": "15, 10, 5, 10","stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dash-dotted | orange",    "stroke": "#dc8f00", "stroke-dasharray": "15, 10, 5, 10","stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dash-dotted | purple",    "stroke": "#b82cff", "stroke-dasharray": "15, 10, 5, 10","stroke-opacity": 0.9, "stroke-width": 2},
            {"name": "dash-dotted | fuschia",   "stroke": "#ab006c", "stroke-dasharray": "15, 10, 5, 10","stroke-opacity": 0.9, "stroke-width": 2}
        ],
        "rectangles": [
            {"name": "base",    "fill": "#be6a62", "fill-opacity": 0.3, "stroke": "#be6a62", "stroke-width": 1.5},
            {"name": "black",   "fill": "#000000", "fill-opacity": 0.2, "stroke": "#000000", "stroke-width": 0},
            {"name": "red",     "fill": "#e32727", "fill-opacity": 0.2, "stroke": "#6f0000", "stroke-width": 0},
            {"name": "green",   "fill": "#22ba53", "fill-opacity": 0.2, "stroke": "#006a1e", "stroke-width": 0},
            {"name": "blue",    "fill": "#3aa4e5", "fill-opacity": 0.2, "stroke": "#006dbe", "stroke-width": 0},
            {"name": "orange",  "fill": "#ffb100", "fill-opacity": 0.2, "stroke": "#dc8f00", "stroke-width": 0},
            {"name": "purple",  "fill": "#b82cff", "fill-opacity": 0.2, "stroke": "#5e5e5e", "stroke-width": 0},
            {"name": "fuschia", "fill": "#d4266e", "fill-opacity": 0.2, "stroke": "#ab006c", "stroke-width": 0}
        ],
        "texts": [
            {"name": "base",            "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#000",    "fill-opacity": 1},
            {"name": "header",          "font-size": "12px", "rotate": 0, "font-weight": "bold",   "text-anchor": "middle", "fill": "#000",    "fill-opacity": 1},
            {"name": "title",           "font-size": "12px", "rotate": 0, "font-weight": "bold",   "text-anchor": "middle", "fill": "#000",    "fill-opacity": 1},
            {"name": "transparent",     "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#000000", "fill-opacity": 0},
            {"name": "normal | black",  "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#000000", "fill-opacity": 1},
            {"name": "normal | red",    "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#6f0000", "fill-opacity": 1},
            {"name": "normal | green",  "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#006a1e", "fill-opacity": 1},
            {"name": "normal | blue",   "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#006dbe", "fill-opacity": 1},
            {"name": "normal | orange", "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#dc8f00", "fill-opacity": 1},
            {"name": "normal | purple", "font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#b82cff", "fill-opacity": 1},
            {"name": "normal | fuschia","font-size": "12px", "rotate": 0, "font-weight": "normal", "text-anchor": "start",  "fill": "#ab006c", "fill-opacity": 1}
        ]
    }
})
_.extend(D3Visualization.prototype, D3Plot.prototype, {
    setDefaults: function(){
        throw "Abstract method; requires implementation";
    },
    render: function($div){
        throw "Abstract method; requires implementation";
    },
    processData: function(){
        throw "Abstract method; requires implementation";
    },
    apply_text_styles: function(obj, styles){
        obj = d3.select(obj);
        _.each(styles, function(v, k){ obj.style(k, v); })
        if(styles.rotate>0){
            obj.attr("transform", "rotate({0} {1},{2})".printf(
            styles.rotate, obj.attr("x"), obj.attr("y")));
        }
    }
});


EndpointAggregation = function(data){
    Visual.apply(this, arguments);
    this.endpoints = data.endpoints.map(function(d){
        var e = new Endpoint(d);
        e.switch_dose_units(data.dose_units);
        return e;
    });
    delete this.data.endpoints;
};
_.extend(EndpointAggregation.prototype, Visual.prototype, {
    displayAsPage: function($el, options){
        var title = $("<h1>").text(this.data.title),
            caption = new SmartTagContainer($('<div>').html(this.data.caption)),
            self = this;

        options = options || {};

        if (window.isEditable) title.append(this.addActionsMenu());

        this.$tblDiv = $('<div>');
        this.$plotDiv = $('<div>');

        var btn = $('<button type="button" class="btn btn-mini" title="Toggle table-view representation">')
            .append('<i class="icon-chevron-right"></i>')
            .click(function(){self.buildTbl();});

        $el.empty()
           .append(this.$plotDiv)
           .append(this.$tblDiv);

        if (!options.visualOnly){
            $el.prepend(title)
                .append("<h2>Caption</h2>")
                .append(caption.getEl());
        }

        this.buildTbl();
        this.plotData = this.getPlotData();
        this.buildPlot();
        caption.ready();
        return this;
    },
    displayAsModal: function(options){
        options = options || {};

        var self = this,
            modal = new HAWCModal()
            caption = new SmartTagContainer($('<div>').html(this.data.caption));

        this.$tblDiv = $('<div>');
        this.$plotDiv = $('<div>');

        modal.getModal().on('shown', function(){
            self.buildPlot();
            caption.ready();
        });

        this.buildTbl();
        this.plotData = this.getPlotData();
        modal.addHeader($('<h4>').text(this.data.title))
            .addBody($('<div>').append(
                this.$plotDiv,
                this.$tblDiv,
                caption.getEl()
            ))
            .addFooter("")
            .show({maxWidth: 1200});
    },
    buildTbl: function(){
        if(this.table){
            this.table.unshift(this.table.pop());
        } else {
            // todo: get default from options, if one exists
            this.table = [this.buildTblPOD, this.buildTblEvidence];
        }
        this.$tblDiv.html(this.table[0].apply(this, arguments));
    },
    buildTblPOD: function(){
        var tbl = new BaseTable(),
            showEndpointDetail = function(e){
                e.preventDefault();
                var tr = $(this).parent().parent();
                if (tr.data('detail_row')){
                    tr.data('detail_row').toggle_view(!tr.data('detail_row').object_visible);
                } else {
                    var ep = tr.data('endpoint'),
                        div_id = String.random_string()
                        colspan = tr.children().length;

                    tr.after('<tr><td colspan="{0}"><div id="{1}"></div></td></tr>'.printf(colspan, div_id))
                      .data('detail_row', new EndpointDetailRow(ep, '#'+div_id, 1));
                }
            };

        tbl.addHeaderRow([
            'Study', 'Experiment', 'Animal Group', 'Endpoint',
            'NOEL', 'LOEL', 'BMD', 'BMDL']);

        this.endpoints.forEach(function(e){
            tbl.addRow([
                '<a href="{0}">{1}</a>'.printf(
                    e.data.animal_group.experiment.study.url,
                    e.data.animal_group.experiment.study.short_citation),
                '<a href="{0}">{1}</a>'.printf(
                    e.data.animal_group.experiment.url,
                    e.data.animal_group.experiment.name),
                '<a href="{0}">{1}</a>'.printf(
                    e.data.animal_group.url,
                    e.data.animal_group.name),
                e._endpoint_detail_td(),
                e.get_special_dose_text('NOEL'),
                e.get_special_dose_text('LOEL'),
                e.get_bmd_special_values('BMD'),
                e.get_bmd_special_values('BMDL')
            ]).data('endpoint', e);
        });

        return tbl.getTbl().on('click', '.endpoint-selector', showEndpointDetail);
    },
    buildTblEvidence: function(){
        var tbl = new BaseTable();

        tbl.addHeaderRow(['Study', 'Experiment', 'Animal Group', 'Endpoint']);

        this.endpoints.forEach(function(e){

            var ep_tbl = $('<div>')
                    .append('<a href="{0}">{1}</a>'.printf(e.data.url, e.data.name))
                    .append(e.build_endpoint_table($('<table class="table table-condensed">')));

            tbl.addRow([
                '<a href="{0}">{1}</a>'.printf(
                    e.data.animal_group.experiment.study.url,
                    e.data.animal_group.experiment.study.short_citation),
                '<a href="{0}">{1}</a>'.printf(
                    e.data.animal_group.experiment.url,
                    e.data.animal_group.experiment.name),
                '<a href="{0}">{1}</a>'.printf(
                    e.data.animal_group.url,
                    e.data.animal_group.name),
                ep_tbl
            ]);
        });

        return tbl.getTbl();
    },
    buildPlot: function(){
        if(this.plot){
            this.plot.unshift(this.plot.pop());
        } else {
            // todo: get default from options, if one exists
            this.plot = [
                new EndpointAggregationExposureResponsePlot(this, this.plotData),
                new EndpointAggregationForestPlot(this, this.plotData)
            ];
        }
        this.$tblDiv.html(this.plot[0].render(this.$plotDiv));
    },
    getPlotData: function(){
        return {
            title: this.data.title,
            endpoints: this.endpoints,
        }
    },
    addPlotToggleButton: function(){
        return {
            id:'plot_toggle',
            cls: 'btn btn-mini',
            title: 'View alternate visualizations',
            text: '',
            icon: 'icon-circle-arrow-right',
            on_click: this.buildPlot.bind(this)
        };
    }
});


EndpointAggregationForestPlot = function(parent, data, options){
    D3Visualization.apply(this, arguments);
    this.setDefaults();
};
_.extend(EndpointAggregationForestPlot.prototype, D3Visualization.prototype, {
    setDefaults: function(){
        this.padding = {top:40, right:20, bottom:40, left:30};
        this.padding.left_original = this.padding.left;
        this.buff = 0.05; // addition numerical-spacing around dose/reponse units
    },
    render: function($div){
        this.plot_div = $div;
        this.processData();
        this.build_plot_skeleton(true);
        this.add_title();
        this.add_axes();
        this.add_endpoint_lines();
        this.add_dose_points();
        this.add_axis_text();
        this.add_final_rectangle();
        this.build_x_label();
        this.build_y_label();
        this.add_legend();
        this.resize_plot_dimensions();
        this.trigger_resize();
        if (this.menu_div){
            this.menu_div.remove();
            delete this.menu_div;
        }
        this.add_menu();
        this.add_menu_button(this.parent.addPlotToggleButton());
    },
    processData: function(){
        var points = [],
            lines = [],
            endpoint_labels = [],
            y = 0, val, control, lower_ci, upper_ci, egs,
            getCoordClass = function(e, i){
                if (e.data.LOEL == i) return "LOEL"
                if (e.data.NOEL == i) return "NOEL"
                return ""
            },
            dose_units = this.data.endpoints[0].dose_units;

        _.chain(this.data.endpoints)
         .filter(function(e){return e.hasEGdata();})
         .each(function(e){

            egs = _.filter(e.data.groups, function(d){ return d.isReported; });

            endpoint_labels.push({
                endpoint: e,
                y: (y + (egs.length*0.5)),
                label:  "{0}- {1}- {2}: {3}".printf(
                    e.data.animal_group.experiment.study.short_citation,
                    e.data.animal_group.experiment.name,
                    e.data.animal_group.name,
                    e.data.name)
            });

            egs.forEach(function(eg, i){
                txt = [
                    e.data.animal_group.experiment.study.short_citation,
                    e.data.name,
                    'Dose: ' + eg.dose,
                    'N: ' + eg.n
                ];

               if (i === 0){
                    // get control value
                    if (e.data.data_type == 'C'){
                        control = parseFloat(eg.response, 10);
                    } else {
                        control = parseFloat(eg.incidence / eg.n, 10);
                    }
                    if (control === 0){control = 1e-10;}
                }

                // get plot value
                y += 1;
                if (e.data.data_type == 'C'){
                    txt.push('Mean: ' + eg.response, 'Stdev: ' + eg.stdev);
                    val = (eg.response - control) / control;
                    lower_ci = (eg.lower_limit - control) / control;
                    upper_ci = (eg.upper_limit - control) / control;
                } else {
                    txt.push('Incidence: ' + eg.incidence);
                    val = eg.incidence / eg.n;
                    lower_ci = eg.lower_limit;
                    upper_ci = eg.upper_limit;
                }
                points.push({
                    'x':val,
                    'y':y,
                    'class': getCoordClass(e, i),
                    'text': txt.join('\n'),
                    'dose': eg.dose,
                    'lower_ci': lower_ci,
                    'upper_ci': upper_ci,
                    'endpoint': e
                });
            });
            y+=1;
            lines.push({'y': y, 'endpoint': e.data.name});
        });

        // remove final spacer-line
        lines.pop();
        y-=1;

        // calculate dimensions
        var plot_width = parseInt(this.plot_div.width() - this.padding.right - this.padding.left, 10),
            plot_height = parseInt(points.length*20, 10),
            container_height = parseInt(plot_height + this.padding.top + this.padding.bottom + 45, 10);

        // set settings to object
        _.extend(this, {
            points: points,
            lines: lines,
            endpoint_labels: endpoint_labels,
            min_x: d3.min(points, function(v){return v.lower_ci;}),
            max_x: d3.max(points, function(v){return v.upper_ci;}),
            min_y: 0,
            max_y: y+=1,
            w: plot_width,
            h: plot_height,
            title_str: this.data.title,
            x_label_text: "% change from control (continuous), % incidence (dichotomous)",
            y_label_text: "Doses ({0})".printf(dose_units)
        });
        this.plot_div.css({'height': '{0}px'.printf(container_height)});
    },
    add_axes: function() {
        // using plot-settings, customize axes
        this.x_axis_settings = {
            'scale_type': 'linear',
            'domain': [this.min_x-this.max_x*this.buff, this.max_x*(1+this.buff)],
            'rangeRound': [0, this.w],
            'text_orient': "bottom",
            'x_translate': 0,
            'y_translate': this.h,
            'axis_class': 'axis x_axis',
            'gridlines': true,
            'gridline_class': 'primary_gridlines x_gridlines',
            'number_ticks': 10,
            'axis_labels':true,
            'label_format':d3.format(".0%")
        };

        this.y_axis_settings = {
            'scale_type': 'linear',
            'domain': [this.max_y, this.min_y],  // invert axis
            'rangeRound': [this.h, 0],
            'text_orient': "left",
            'x_translate': 0,
            'y_translate': 0,
            'axis_class': 'axis y_axis',
            'gridlines': false,
            'gridline_class': 'primary_gridlines y_gridlines',
            'number_ticks': 10,
            'axis_labels':false,
            'label_format':undefined //default
        };
        this.build_x_axis();
        this.build_y_axis();
    },
    resize_plot_dimensions: function(){
        // Resize plot based on the dimensions of the labels.
        var ylabel_width = d3.max(this.plot_div.find('.forest_plot_labels').map(
                                  function(){return this.getComputedTextLength();})) +
                           d3.max(this.plot_div.find('.dr_tick_text').map(
                                  function(){return this.getComputedTextLength();}));
        if (this.padding.left < this.padding.left_original + ylabel_width){
            this.padding.left = this.padding.left_original + ylabel_width;
            this.render(this.plot_div);
        }
    },
    add_endpoint_lines: function(){
        // horizontal line separators between endpoints
        var x = this.x_scale,
            y = this.y_scale,
            lower = [],
            upper = [];

        //horizontal lines
        this.vis.selectAll("svg.endpoint_lines")
            .data(this.lines)
          .enter().append("line")
            .attr("x1", function(d) { return x(x.domain()[0]); })
            .attr("y1", function(d) { return y(d.y); })
            .attr("x2", function(d) { return x(x.domain()[1]); })
            .attr("y2", function(d) { return y(d.y); })
            .attr('class','primary_gridlines');

        // add vertical line at zero
        this.vis.append("line")
            .attr("x1", this.x_scale(0))
            .attr("y1", this.y_scale(this.min_y))
            .attr("x2", this.x_scale(0))
            .attr("y2", this.y_scale(this.max_y))
            .attr('class','reference_line');
    },
    add_dose_points: function(){

        var x = this.x_scale,
            y = this.y_scale,
            self = this,
            lines = this.points.filter(function(v){
                return ($.isNumeric(v.lower_ci)) && ($.isNumeric(v.upper_ci));
            }),
            points = this.points.filter(function(v){
                return ($.isNumeric(v.x));
            });

        // horizontal confidence interval line
        this.vis.selectAll("svg.error_bars")
            .data(lines)
          .enter().append("line")
            .attr("x1", function(d) { return x(d.lower_ci); })
            .attr("y1", function(d) { return y(d.y); })
            .attr("x2", function(d) { return x(d.upper_ci); })
            .attr("y2", function(d) { return y(d.y); })
            .attr('class','dr_err_bars');

        // lower vertical vertical confidence intervals line
        this.vis.selectAll("svg.error_bars")
            .data(lines)
          .enter().append("line")
            .attr("x1", function(d) { return x(d.lower_ci); })
            .attr("y1", function(d) { return y(d.y)-5; })
            .attr("x2", function(d) { return x(d.lower_ci); })
            .attr("y2", function(d) {return y(d.y)+5; })
            .attr('class','dr_err_bars');

        // upper vertical confidence intervals line
        this.vis.selectAll("svg.error_bars")
            .data(lines)
          .enter().append("line")
            .attr("x1", function(d) { return x(d.upper_ci); })
            .attr("y1", function(d) { return y(d.y)-5; })
            .attr("x2", function(d) { return x(d.upper_ci); })
            .attr("y2", function(d) {return y(d.y)+5; })
            .attr('class','dr_err_bars');

        // central tendency of percent-change
        this.dots = this.vis.selectAll("path.dot")
            .data(points)
          .enter().append("circle")
            .attr("r","7")
            .attr("class", function(d){ return "dose_points " + d.class;})
            .style("cursor", "pointer")
            .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; })
            .on('click', function(v){v.endpoint.displayAsModal();});

        // add the outer element last
        this.dots.append("svg:title").text(function(d) { return d.text; });
    },
    add_axis_text: function(){
        // Next set labels on axis
        var y_scale = this.y_scale, x_scale = this.x_scale;
        this.y_dose_text = this.vis.selectAll("y_axis.text")
            .data(this.points)
        .enter().append("text")
            .attr("x", -5)
            .attr("y", function(v,i){return y_scale(v.y);})
            .attr("dy", "0.5em")
            .attr('class','dr_tick_text')
            .attr("text-anchor", "end")
            .text(function(d,i) { return d.dose;});

        this.labels = this.vis.selectAll("y_axis.text")
            .data(this.endpoint_labels)
        .enter().append("text")
            .attr("x", -this.padding.left+25)
            .attr("y", function(v,i){return y_scale(v.y);})
            .attr('class','dr_title forest_plot_labels')
            .attr("text-anchor", "start")
            .style("cursor", "pointer")
            .text(function(d,i) { return d.label;})
            .on('click', function(v){v.endpoint.displayAsModal();});
    },
    add_legend: function(){
        var addItem = function(txt, cls, color){
                return {"text": txt, "classes": cls, "color": color}
            },
            item_height = 20,
            box_w = 110,
            items = [
                addItem("Doses in Study", "dose_points")
            ];

        if (this.plot_div.find('.LOEL').length > 0) items.push(addItem("LOEL", "dose_points LOEL"))
        if (this.plot_div.find('.NOEL').length > 0) items.push(addItem("NOEL", "dose_points NOEL"))
        if (this.plot_div.find('.BMDL').length > 0)  items.push(addItem("BMDL",  "dose_points BMDL"))

        this.build_legend({
            items: items,
            item_height: item_height,
            box_w: box_w,
            box_h: items.length*item_height,
            box_l: this.w + this.padding.right - box_w - 10,
            dot_r: 5,
            box_t: 10-this.padding.top,
            box_padding: 5
        });
    }
});


EndpointAggregationExposureResponsePlot = function(parent, data, options){
    D3Visualization.apply(this, arguments);
    this.setDefaults();
};
_.extend(EndpointAggregationExposureResponsePlot.prototype, D3Visualization.prototype, {
    setDefaults: function(){
        var left = 25,
            formatNumber = d3.format(",.f");

        _.extend(this, {
            default_x_scale: "log",
            padding: {
                top:40,
                right:20,
                bottom:40,
                left:left,
                left_original: left
            },
            buff: 0.05,
            x_axis_settings: {
                scale_type: this.options.default_x_axis || 'log',
                text_orient: "bottom",
                axis_class: 'axis x_axis',
                gridlines: true,
                gridline_class: 'primary_gridlines x_gridlines',
                number_ticks: 10,
                axis_labels: true,
                label_format: formatNumber
            },
            y_axis_settings: {
                scale_type: 'ordinal',
                text_orient: 'left',
                axis_class: 'axis y_axis',
                gridlines: true,
                gridline_class: 'primary_gridlines y_gridlines',
                axis_labels: true,
                label_format: undefined //default
            }
        });
    },
    render: function($div){
        var self = this;
        this.plot_div = $div;
        this.processData();
        this.build_plot_skeleton(true);
        this.add_title();
        this.add_axes();
        this.build_x_label();
        this.build_y_label();
        this.add_dose_lines();
        this.add_dose_points();
        this.add_final_rectangle();
        this.add_legend();
        this.customize_menu();
        this.resize_plot_dimensions();
        this.trigger_resize();
        if (this.menu_div){
            this.menu_div.remove();
            delete this.menu_div;
        }
        this.add_menu();
        this.add_menu_button(this.parent.addPlotToggleButton());
    },
    processData: function(){
        var min = Infinity,
            max = -Infinity,
            default_x_scale = this.default_x_scale,
            lines_data = [],
            points_data = [],
            dose_units = this.data.endpoints[0].dose_units,
            egs;

        this.data.endpoints.filter(function(e){
            return e.data.groups.length>0;
        }).forEach(function(e){
            egs = e.data.groups;

            // get min/max information
            min = (default_x_scale == "log") ? Math.min(min, egs[1].dose) : Math.min(min, egs[0].dose);
            max = Math.max(max, egs[egs.length-1].dose);
            if (isFinite(e.get_bmd_special_values('BMDL'))) {
                min = Math.min(min, e.get_bmd_special_values('BMDL'));
                max = Math.max(max, e.get_bmd_special_values('BMDL'));
            }

            //setup lines information for dose-response line (excluding control)
            lines_data.push({
                y: e.data.id,
                name: "{0}- {1}- {2}: {3}".printf(
                    e.data.animal_group.experiment.study.short_citation,
                    e.data.animal_group.experiment.name,
                    e.data.animal_group.name,
                    e.data.name),
                x_lower: egs[1].dose,
                x_upper: egs[egs.length-1].dose
            });

            // setup points information

            // add LOEL/NOEL
            egs.forEach(function(v2,i2){
                txt = [e.data.animal_group.experiment.study.short_citation,
                       e.data.name,
                       'Dose: ' + v2.dose,
                       'N: ' + v2.n];
                if (v2.dose>0){
                    if (e.data.data_type == 'C'){
                        txt.push('Mean: ' + v2.response, 'Stdev: ' + v2.stdev);
                    } else {
                        txt.push('Incidence: ' + v2.incidence);
                    }
                    coords = {endpoint:e,
                              x:v2.dose,
                              y:e.data.id,
                              classes:'',
                              text: txt.join('\n')};
                    if (e.data.LOEL == i2){ coords.classes='LOEL';}
                    if (e.data.NOEL == i2){ coords.classes='NOEL';}
                    points_data.push(coords);
                }
            });
            // add BMDL
            if (isFinite(e.get_bmd_special_values('BMDL'))) {
                txt = [
                    e.data.animal_group.experiment.study.short_citation,
                    e.data.name,
                    'BMD Model: ' + e.data.BMD.outputs.model_name,
                    'BMD: ' + e.data.BMD.outputs.BMD + ' (' + e.data.dose_units + ')',
                    'BMDL: ' + e.data.BMD.outputs.BMDL + ' (' + e.data.dose_units + ')'
                ];

                points_data.push({
                    endpoint:e,
                    x: e.get_bmd_special_values('BMDL'),
                    y: e.data.id,
                    classes: 'BMDL',
                    text : txt.join('\n')
                });
            }
        });

        // calculate dimensions
        var plot_width = parseInt(this.plot_div.width() - this.padding.right - this.padding.left - 20, 10),
            plot_height = parseInt(lines_data.length*40, 10),
            container_height = parseInt(plot_height + this.padding.top + this.padding.bottom + 45, 10);

        _.extend(this, {
            lines_data: lines_data,
            points_data: points_data,
            min_x: min,
            max_x: max,
            min_y: 0,
            max_y: lines_data.length,
            w: plot_width,
            h: plot_height,
            title_str: this.data.title,
            x_label_text: "Dose ({0})".printf(dose_units),
            y_label_text: 'Endpoints',
        });
        this.plot_div.css({'height': '{0}px'.printf(container_height)});
    },
    toggle_x_axis: function(){
        if(window.event && window.event.stopPropagation){event.stopPropagation();}
        if (this.x_axis_settings.scale_type == 'linear'){
            this.x_axis_settings.scale_type = 'log';
            this.x_axis_settings.number_ticks = 1;
            var formatNumber = d3.format(",.f");
            this.x_axis_settings.label_format = formatNumber;
        } else {
            this.x_axis_settings.scale_type = 'linear';
            this.x_axis_settings.number_ticks = 10;
            this.x_axis_settings.label_format = undefined;
        }
        this.update_x_domain();
        this.x_scale = this._build_scale(this.x_axis_settings);
        this.x_axis_change_chart_update();
    },
    x_axis_change_chart_update: function(){
        // Assuming the plot has already been constructed once,
        // rebuild plot with updated x-scale.
        var x = this.x_scale;

        this.rebuild_x_axis();
        this.rebuild_x_gridlines({animate: true});

        //rebuild dosing lines
        this.dosing_lines.selectAll("line")
            .transition()
            .duration(1000)
            .attr("x1", function(d) { return x(d.x_lower);})
            .attr("x2", function(d) { return x(d.x_upper); });

        this.dots
            .transition()
            .duration(1000)
            .attr('cx', function(d){return x(d.x);});
    },
    resize_plot_dimensions: function(){
        // Resize plot based on the dimensions of the labels.
        var ylabel_width = this.vis.select('.y_axis').node().getBoundingClientRect().width;
        if (this.padding.left < this.padding.left_original + ylabel_width){
            this.padding.left = this.padding.left_original + ylabel_width;
            this.render(this.plot_div);
        }
    },
    add_axes: function() {
        // using plot-settings, customize axes
        this.update_x_domain();
        $.extend(this.x_axis_settings, {
            rangeRound: [0, this.w],
            x_translate: 0,
            y_translate: this.h
        });

        $.extend(this.y_axis_settings, {
            domain: this.lines_data.map(function(d) {return d.y;}),
            rangeRound: [0, this.h],
            number_ticks: this.lines_data.length,
            x_translate: 0,
            y_translate: 0
        });
        this.build_x_axis();
        this.build_y_axis();

        var lines_data = this.lines_data;
        d3.select(this.svg).selectAll('.y_axis text')
            .text(function(v, i){
                var name;
                lines_data.forEach(function(endpoint){
                    if (v === endpoint.y) {
                        name = endpoint.name;
                        return;
                    }
                });
                return name;
            });
    },
    update_x_domain: function(){
        var domain_value;
        if (this.x_axis_settings.scale_type === 'linear'){
            domain_value = [this.min_x-this.max_x*this.buff, this.max_x*(1+this.buff)];
        } else {
            domain_value = [this.min_x, this.max_x];
        }
        this.x_axis_settings.domain = domain_value;
    },
    add_dose_lines: function(){
        var x = this.x_scale,
            y = this.y_scale,
            halfway = y.rangeBand()/2;

        this.dosing_lines = this.vis.append("g");
        this.dosing_lines.selectAll("line")
            .data(this.lines_data)
          .enter().append("line")
            .attr("x1", function(d) { return x(d.x_lower); })
            .attr("y1", function(d) {return y(d.y)+halfway;})
            .attr("x2", function(d) { return x(d.x_upper); })
            .attr("y2", function(d) {return y(d.y)+halfway;})
            .attr('class','dr_err_bars'); // todo: rename class to more general name
    },
    add_dose_points: function(){

        var x = this.x_scale,
            y = this.y_scale,
            self = this,
            tt_width = 400,
            halfway = y.rangeBand()/2;

        var tooltip = d3.select("body")
            .append("div")
            .attr('class', 'd3modal')
            .attr('width', tt_width + 'px')
            .style("position", "absolute")
            .style("z-index", "1000")
            .style("visibility", "hidden")
            .on('click', function(){$(this).css('visibility','hidden');});
        this.tooltip = $(tooltip[0]);

        this.dots_group = this.vis.append("g");
        this.dots = this.dots_group.selectAll("circle")
            .data(this.points_data)
          .enter().append("circle")
            .attr("r","7")
            .attr("class", function(d){ return "dose_points " + d.classes;})
            .attr("cursor", "pointer")
            .attr("cx", function(d){return x(d.x);})
            .attr("cy", function(d){return y(d.y)+halfway;})
            .style("cursor", "pointer")
            .on('click', function(v){v.endpoint.displayAsModal();});

        // add the outer element last
        this.dots.append("svg:title").text(function(d) { return d.text; });
    },
    customize_menu: function(){
        this.add_menu();
        this.add_menu_button(this.parent.addPlotToggleButton());
        this.add_menu_button({
            id:'toggle_x_axis',
            cls: 'btn btn-mini',
            title: 'Change x-axis scale (shortcut: click the x-axis label)',
            text: '',
            icon: 'icon-resize-horizontal',
            on_click: this.toggle_x_axis.bind(this)
        });
    },
    add_legend: function(){
        var addItem = function(txt, cls, color){
                return {"text": txt, "classes": cls, "color": color}
            },
            item_height = 20,
            box_w = 110,
            items = [
                addItem("Doses in Study", "dose_points")
            ];

        if (this.plot_div.find('.LOEL').length > 0) items.push(addItem("LOEL", "dose_points LOEL"))
        if (this.plot_div.find('.NOEL').length > 0) items.push(addItem("NOEL", "dose_points NOEL"))
        if (this.plot_div.find('.BMDL').length > 0)  items.push(addItem("BMDL",  "dose_points BMDL"))

        this.build_legend({
            items: items,
            item_height: item_height,
            box_w: box_w,
            box_h: items.length*item_height,
            box_l: this.w + this.padding.right - box_w - 10,
            dot_r: 5,
            box_t: 10-this.padding.top,
            box_padding: 5
        });
    }
});


Crossview = function(data){
    EndpointAggregation.apply(this, arguments);

    // D3.js monkey-patch
    d3.selection.prototype.moveToFront = function(){
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };
};
_.extend(Crossview.prototype, Visual.prototype, {
    displayAsPage: function($el, options){
        var title = $("<h1>").text(this.data.title),
            caption = new SmartTagContainer($('<div>').html(this.data.caption)),
            $plotDiv = $('<div>'),
            data = this.getPlotData();

        options = options || {};

        if (window.isEditable) title.append(this.addActionsMenu());

        $el.empty().append($plotDiv);

        if (!options.visualOnly) $el.prepend(title).append(caption.getEl());

        new CrossviewPlot(this, data, options).render($plotDiv);
        caption.ready();
        return this;
    },
    displayAsModal: function(options){
        options = options || {};

        var self = this,
            data = this.getPlotData(),
            caption = new SmartTagContainer($('<div>').html(this.data.caption)),
            $plotDiv = $('<div>'),
            modal = new HAWCModal();

        modal.getModal().on('shown', function(){
            new CrossviewPlot(self, data, options).render($plotDiv);
            caption.ready();
        });

        modal.addHeader($('<h4>').text(this.data.title))
            .addBody([$plotDiv, caption.getEl()])
            .addFooter("")
            .show({maxWidth: 1200});
    },
    getPlotData: function(){
        return {
            title: this.data.title,
            endpoints: this.endpoints,
            dose_units: this.data.dose_units,
            settings: this.data.settings
        }
    }
});


CrossviewPlot = function(parent, data, options){
    D3Visualization.apply(this, arguments);
    this.setDefaults();
};
_.extend(CrossviewPlot, {
    get_options: function(eps, fld, isLog){
        // get options for input field;
        // should replicate processEndpoint in prototype below
        var numDG = CrossviewPlot._requiredGroups(isLog);
        return _.chain(eps)
                .filter(_.partial(CrossviewPlot._filterEndpoint, _, numDG))
                .map(CrossviewPlot._cw_filter_process[fld])
                .flatten()
                .sortBy()
                .uniq(true)
                .value();
    },
    _requiredGroups: function(isLog){
        return (isLog) ? 3 : 2;
    },
    _filterEndpoint: function(e, numDG){
        // need at-least two non-zero dose-groups for visualization
        return d3.sum(_.pluck(e.data.groups, 'isReported'))>=numDG;
    },
    _filters: {
        "study": "Study",
        "experiment_type": "Experiment type",
        "route_of_exposure": "Route of exposure",
        "lifestage_exposed": "Lifestage exposed",
        "species": "Species",
        "sex": "Sex",
        "generation": "Generation",
        "effects": "Effect tags",
        "system": "System",
        "organ": "Organ",
        "effect": "Effect",
        "effect_subtype": "Effect subtype",
        "monotonicity": "Monotonicity",
    },
    _cw_filter_process: {
        "study": function(d){return d.data.animal_group.experiment.study.short_citation; },
        "experiment_type": function(d){return d.data.animal_group.experiment.type; },
        "route_of_exposure": function(d){return d.data.animal_group.dosing_regime.route_of_exposure; },
        "lifestage_exposed": function(d){return d.data.animal_group.lifestage_exposed; },
        "species": function(d){return d.data.animal_group.species; },
        "sex": function(d){return d.data.animal_group.sex; },
        "generation": function(d){return d.data.animal_group.generation; },
        "effects": function(d){return d.data.effects.map(function(v){return v.name; })},
        "system": function(d){return d.data.system; },
        "organ": function(d){return d.data.organ; },
        "effect": function(d){return d.data.effect; },
        "effect_subtype": function(d){return d.data.effect_subtype; },
        "monotonicity": function(d){return d.data.monotonicity; },
    }
})
_.extend(CrossviewPlot.prototype, D3Visualization.prototype, {
    setDefaults: function(){
        _.extend(this, {
            x_axis_settings: {
                "text_orient": "bottom",
                "axis_class": 'axis x_axis',
                "gridlines": false,
                "gridline_class": 'primary_gridlines x_gridlines',
                "number_ticks": 10,
                "axis_labels": true,
                "label_format": d3.format(",.f")
            },
            y_axis_settings: {
                'scale_type': "linear",
                'text_orient': "left",
                'axis_class': "axis y_axis",
                'gridlines': false,
                'gridline_class': "primary_gridlines y_gridlines",
                'number_ticks': 10,
                'axis_labels': true,
                'label_format': d3.format("%")
            },
            settings: {
                "tag_height": 17,
                "column_padding": 5,
                "filter_padding": 10
            }
        });
    },
    render: function($div){
        this.plot_div = $div.html('');
        this.processData();
        if(this.dataset.length === 0){
            return this.plot_div.html("<p>Error: no endpoints found. Try selecting a different dose-unit, or changing prefilter settings.</p>");
        }
        this.build_plot_skeleton(false);
        this.add_axes();
        this.draw_visualization();
        this.draw_text();
        this.build_labels();
        this.add_menu();
        this.trigger_resize();
    },
    build_labels: function(){

        var midX = d3.mean(this.x_scale.range()),
            midY = d3.mean(this.y_scale.range());

        this.vis.append("svg:text")
            .attr("x", midX)
            .attr("y", -10)
            .text(this.data.settings.title)
            .attr("text-anchor", "middle")
            .attr("class","dr_title");

        this.vis.append("svg:text")
            .attr("x", midX)
            .attr("y", d3.max(this.y_scale.range())+30)
            .text(this.data.settings.xAxisLabel)
            .attr("text-anchor", "middle")
            .attr("class","dr_axis_labels x_axis_label");

        this.vis.append("svg:text")
            .attr("x", -50)
            .attr("y", midY)
            .attr("transform",'rotate(270, -50,  {0})'.printf(midY))
            .text(this.data.settings.yAxisLabel)
            .attr("text-anchor", "middle")
            .attr("class","dr_axis_labels y_axis_label");
    },
    processData: function(){

        // create new class for each colorFilter
        if (this.data.settings.colorFilters){
            this.data.settings.colorFilters.forEach(function(d,i){
                d.className = "_cv_colorFilter"+i;
            });
        }

        // get filter function
        var filters_map = d3.map({
            lt: function(val, tgt){return val<tgt;},
            lte: function(val, tgt){return val<=tgt;},
            gt: function(val, tgt){return val>tgt;},
            gte: function(val, tgt){return val>=tgt;},
            contains: function(val, tgt){
                if (val instanceof Array) val = val.join("|")
                val = val.toString().toLowerCase();
                tgt = tgt.toString().toLowerCase();
                return val.indexOf(tgt.toLowerCase())>-1;
            },
            not_contains: function(val, tgt){
                if (val instanceof Array) val = val.join("|").toLowerCase();
                val = val.toString().toLowerCase();
                tgt = tgt.toString().toLowerCase();
                return val.indexOf(tgt.toLowerCase())===1;
            },
            exact: function(val, tgt){
                tgt = tgt.toString().toLowerCase();
                if (val instanceof Array){
                    return _.chain(val)
                            .map(function(itm){return itm.toString().toLowerCase() === tgt;})
                            .any()
                            .value();
                } else {
                    return val.toString().toLowerCase() === tgt;
                }
            },
        });
        if(this.data.settings.endpointFilters){
            this.data.settings.endpointFilters.forEach(function(d){
                d.fn = _.partial(filters_map.get(d.filterType), _, d.value);
            });
        }

        // filter endpoints
        var self = this,
            settings = this.data.settings,
            getFilters = function(d){
                var obj = {}, fld;
                settings.filters.forEach(function(fld){
                    obj[fld.name] = CrossviewPlot._cw_filter_process[fld.name](d);
                });
                return obj;
            },
            processEndpoint = function(e){
                var filters = getFilters(e),
                    egFilter = (settings.dose_isLog) ? function(eg, i){return i>0;} : function(eg, i){return true;},
                    classes = [],
                    stroke = settings.colorBase,
                    egs, i, filt, vals;

                // apply color filters (reverse order)
                for (i = settings.colorFilters.length-1; i>=0; i--){
                    colorFilt = settings.colorFilters[i];
                    vals = CrossviewPlot._cw_filter_process[colorFilt.field](e)
                    if(self.isMatch(vals, colorFilt.value)){
                        stroke = colorFilt.color;
                        classes.push(colorFilt.className);
                    }
                }

                egs = e.data.groups
                        .filter(egFilter)
                        .map(function(eg){
                            return {
                                'dose': eg.dose,
                                'resp': e._percent_change_control(eg.dose_group_id)/100,
                                'title': e.data.name,
                                'endpoint': e,
                                'filters': filters,
                                'baseStroke': stroke,
                                'currentStroke': stroke,
                                'classes': classes,
                            }
                        });

                return {
                    'filters': filters,
                    'plotting': egs,
                    'dose_extent': d3.extent(egs, function(d){return d.dose}),
                    'resp_extent': d3.extent(egs, function(d){return d.resp})
                };
            },
            applyEndpointFilters = function(e){
                if (settings.endpointFilterLogic.length === 0) return true;
                var val,
                    res = _.map(settings.endpointFilters, function(filter){
                        val = CrossviewPlot._cw_filter_process[filter.field](this)
                        return filter.fn(val);
                    }, e);
                return (settings.endpointFilterLogic==="and") ? _.all(res) : _.any(res);
            },
            dose_units = (this.data.endpoints.length>0) ? this.data.endpoints[0].dose_units : "N/A",
            numDG = CrossviewPlot._requiredGroups(settings.dose_isLog),
            dataset = _.chain(this.data.endpoints)
                .filter(_.partial(CrossviewPlot._filterEndpoint, _, numDG))
                .filter(applyEndpointFilters)
                .map(processEndpoint)
                .value(),
            container_height = settings.height + 50,  // menu-spacing
            dose_scale = (settings.dose_isLog) ? "log" : "linear";

        // build filters
        var filters = _.chain(settings.filters)
               .map(function(f){
                    var vals = _.chain(f.values);
                    if(f.allValues){
                        vals = _.chain(dataset)
                                .map(function(d){return d.filters[f.name];})
                                .flatten()
                                .sort()
                                .uniq(true)
                                .filter(function(d){return d != "";});
                    }
                    return vals.map(function(d){return {'field': f.name, 'status': false, 'text': d, 'headerName': f.headerName};}).value();
               })
               .filter(function(d){return d.length>0;})
               .value();

        _.extend(this, {
            dataset: dataset,
            filters: filters,
            active_filters: [],
            plot_settings: settings,
            w: settings.inner_width,
            h: settings.inner_height,
            dose_scale: dose_scale,
            padding: {
                "top": settings.padding_top,
                "right": settings.width-settings.padding_left-settings.inner_width,
                "bottom": settings.height-settings.padding_top-settings.inner_height,
                "left": settings.padding_left,
                "left_original": settings.padding_left
            }
        });
        this._set_ranges();
        this.plot_div.css({'height': '{0}px'.printf(container_height)});
    },
    _set_ranges: function(){
        var parseRange = function(txt){
                var arr = txt.split(",");
                if(arr.length !== 2) return false;
                _.each(arr, parseFloat)
                return (_.all( _.map(arr, isFinite))) ? arr : false;
            },
            dose_range = parseRange(this.data.settings.dose_range || ""),
            resp_range = parseRange(this.data.settings.response_range || "");

        if (!dose_range){
            dose_range = [
                d3.min(this.dataset, function(v){return v.dose_extent[0];}),
                d3.max(this.dataset, function(v){return v.dose_extent[1];})
            ];
        }

        if (!resp_range){
            resp_range = [
                d3.min(this.dataset, function(d){return d.resp_extent[0];}),
                d3.max(this.dataset, function(d){return d.resp_extent[1];})
            ];
        }

        _.extend(this, {
            dose_range: dose_range,
            response_range: resp_range
        });
    },
    add_axes: function(){
        _.extend(this.x_axis_settings, {
            "scale_type": this.dose_scale,
            "domain": this.dose_range,
            "rangeRound": [0, this.plot_settings.inner_width],
            "x_translate": 0,
            "y_translate": this.plot_settings.inner_height
        });

        _.extend(this.y_axis_settings, {
            "domain": this.response_range,
            "number_ticks": 10,
            "rangeRound": [this.plot_settings.inner_height, 0],
            "x_translate": 0,
            "y_translate": 0
        });

        this.build_x_axis();
        this.build_y_axis();
    },
    _draw_ref_ranges: function(){
        var x = this.x_scale,
            y = this.y_scale,
            hrng, vrng,
            filter_rng = function(d){return $.isNumeric(d.lower) && $.isNumeric(d.upper);},
            make_hrng = function(d){
                return {
                    x: x.range()[0], width:  Math.abs(x.range()[1] - x.range()[0]),
                    y: y(d.upper),   height: Math.abs(y(d.upper) - y(d.lower)),
                    title: d.title,
                    styles: _.findWhere(D3Visualization.styles.rectangles, {name: d.style})
                }
            },
            make_vrng = function(d){
                return {
                    x: x(d.lower),   width:  Math.abs(x(d.upper) - x(d.lower)),
                    y: y.range()[1], height: Math.abs(y.range()[1] - y.range()[0]),
                    title: d.title,
                    styles: _.findWhere(D3Visualization.styles.rectangles, {name: d.style})
                }
            };

        hrng = _.chain(this.plot_settings.refranges_response)
          .filter(filter_rng)
          .map(make_hrng)
          .value();

        vrng = _.chain(this.plot_settings.refranges_dose)
          .filter(filter_rng)
          .map(make_vrng)
          .value();

        hrng.push.apply(hrng, vrng);
        if (hrng.length===0) return;

        this.g_reference_ranges = this.vis.append("g");
        this.g_reference_ranges.selectAll("rect")
                .data(hrng)
            .enter().append("svg:rect")
                .attr("x",      function(d){ return d.x; })
                .attr("y",      function(d){ return d.y; })
                .attr("width",  function(d){ return d.width; })
                .attr("height", function(d){ return d.height; })
                .each(function(d){ d3.select(this).attr(d.styles); });

        this.g_reference_ranges.selectAll("rect")
            .append("svg:title").text(function(d) { return d.title; });
    },
    _draw_ref_lines: function(){
        var x = this.x_scale,
            y = this.y_scale,
            hrefs, vrefs,
            filter_ref = function(d){return $.isNumeric(d.value);},
            make_href = function(d){
                return {
                    x1: x.range()[0], x2: x.range()[1],
                    y1: y(d.value),   y2: y(d.value),
                    title: d.title,
                    styles: _.findWhere(D3Visualization.styles.lines, {name: d.style})
                }
              },
              make_vref = function(d){
                return {
                    x1: x(d.value),   x2: x(d.value),
                    y1: y.range()[0], y2: y.range()[1],
                    title: d.title,
                    styles: _.findWhere(D3Visualization.styles.lines, {name: d.style})
                }
              };

        hrefs = _.chain(this.plot_settings.reflines_response)
          .filter(filter_ref)
          .map(make_href)
          .value();

        vrefs = _.chain(this.plot_settings.reflines_dose)
          .filter(filter_ref)
          .map(make_vref)
          .value();

        hrefs.push.apply(hrefs, vrefs);
        if (hrefs.length===0) return;

        this.g_reference_lines = this.vis.append("g");
        this.g_reference_lines.selectAll("line")
                .data(hrefs)
            .enter().append("svg:line")
                .attr("x1", function(d){ return d.x1; })
                .attr("x2", function(d){ return d.x2; })
                .attr("y1", function(d){ return d.y1; })
                .attr("y2", function(d){ return d.y2; })
                .each(function(d){ d3.select(this).attr(d.styles); });

        this.g_reference_lines.selectAll("line")
            .append("svg:title").text(function(d) { return d.title; });
    },
    _draw_labels: function(){

        var self = this,
            drag, dlabels, labels

        dlabels = _.map(this.plot_settings.labels, function(d){
            d._style = _.findWhere(D3Visualization.styles.texts, {name: d.style});
            return d;
        });

        // add labels
        if (this.options.dev){
            drag = d3.behavior.drag()
                .origin(Object)
                .on("drag", function(d,i){
                    var regexp = /\((-?[0-9]+)[, ](-?[0-9]+)\)/,
                        p = d3.select(this),
                        m = regexp.exec(p.attr("transform"));
                        if (m !== null && m.length===3){
                            var x = parseFloat(m[1]) + d3.event.dx,
                                y = parseFloat(m[2]) + d3.event.dy;
                            p.attr("transform", "translate(" + x + "," + y + ")");
                            self.setLabelLocation(i, x, y);
                        }
                });
        } else {
            drag = function(){};
        }

        labels = this.vis.append("g")
            .attr('class', 'label_holder')
            .selectAll('g.labels')
                .data(dlabels)
            .enter().append('g')
            .attr('class', 'labels')
            .attr('transform', function(d,i){
                return 'translate({0},{1})'.printf(d.x, d.y);
            })
            .attr("cursor", (this.options.dev) ? "pointer" : "auto")
            .call(drag)
            .each(function(d){
                d3.select(this)
                  .append("text")
                      .attr('x', 0)
                      .attr('y', 0)
                      .text(function(d){return d.caption;})
                      .each(function(d){self.apply_text_styles(this, d._style);})
                      .each(function(d){HAWCUtils.wrapText(this, d.max_width)});
            })

        if (this.options.dev){
            labels.each(function(d){
                var bb = this.getBBox();
                d3.select(this)
                    .insert("rect", ":first-child")
                    .attr("fill", "orange")
                    .attr("opacity", "0.1")
                    .attr("x", bb.x)
                    .attr("y", bb.y)
                    .attr("width", bb.width)
                    .attr("height", bb.height)
                    .append("svg:title").text(function(d) { return "drag to reposition"; });
            });
        }
    },
    _bringColorFilterToFront: function(d){
        this.vis.selectAll("." + d.className).moveToFront();
    },
    _draw_colorFilterLabels: function(){
        if (!this.plot_settings.colorFilterLegend || this.plot_settings.colorFilters.length === 0) return;

        var self = this,
            translate = 'translate({0},{1})'.printf(
                this.plot_settings.colorFilterLegendX,
                this.plot_settings.colorFilterLegendY),
            height = 0,
            drag = (!this.options.dev) ? function(){} :
                HAWCUtils.updateDragLocationTransform(function(x, y){
                  self.plot_settings.colorFilterLegendX = x;
                  self.plot_settings.colorFilterLegendY = y;
                }),
            labels, bb;

        labels = this.vis.append("g")
            .attr('class', 'colorFilterLabels')
            .attr('transform', translate)
            .call(drag);

        labels
            .append('text')
            .attr("x", 0)
            .attr("y", 0)
            .attr("text-anchor", "start")
            .attr('class', 'crossview_title')
            .text(this.plot_settings.colorFilterLegendLabel);

        labels.selectAll('g.labels')
            .data(this.plot_settings.colorFilters)
            .enter().append('text')
                .attr('class', 'crossview_colorFilter')
                .attr('x', 0)
                .attr('y', function(d){
                    height += 15;
                    return height;
                })
                .text(function(d){return d.headerName;})
                .style('fill', function(d){ return d.color; })
                .on('mouseover', function(d){
                    d3.select(this)
                        .style("fill", self.plot_settings.colorHover);
                    self.vis.selectAll("." + d.className)
                        .style("stroke", self.plot_settings.colorHover);
                    self._bringColorFilterToFront(d);
                }).on('mouseout', function(d){
                    d3.select(this)
                        .style("fill", d.color);
                    self.vis.selectAll("." + d.className)
                        .style("stroke", d.color);
                });

        if (this.options.dev){
            bb = labels.node().getBBox();
            d3.select(labels.node())
                .insert("rect", ":first-child")
                .attr("cursor", "pointer")
                .attr("fill", "orange")
                .attr("opacity", "0.1")
                .attr("x", bb.x)
                .attr("y", bb.y)
                .attr("width", bb.width)
                .attr("height", bb.height)
                .append("svg:title").text(function(d) { return "drag to reposition"; });
        }
    },
    draw_visualization: function(){
        var x = this.x_scale,
            y = this.y_scale,
            self = this;

        this._draw_ref_ranges();
        this._draw_ref_lines();

        // response-lines
        var response_centerlines = this.vis.append("g"),
            line = d3.svg.line()
                .interpolate("basis")
                .x(function(d){return x(d.dose);})
                .y(function(d){return y(d.resp);}),
            plotData = this.dataset.map(function(d){return d.plotting;});

        response_centerlines.selectAll(".crossview_paths")
            .data(plotData)
          .enter().append("path")
            .attr("class", function(d){return "crossview_paths " + d[0].classes.join(" ");})
            .attr("d", line)
            .style("stroke", function(d){return d[0].currentStroke;})
            .on('click', function(d){d[0].endpoint.displayAsModal();})
            .on('mouseover', function(d){
                if ((self.active_filters.length===0) ||
                    (d[0].currentStroke === self.plot_settings.colorSelected)){
                    d3.select(this).style('stroke', self.plot_settings.colorHover);
                }
                self.change_show_selected_fields(this, d, true);
            })
            .on('mouseout', function(d){
                d3.select(this).style('stroke', d[0].currentStroke);
                self.change_show_selected_fields(this, d, false);
            })
            .append("svg:title").text(function(d){return d[0].title;});

        this._draw_labels();
        this._draw_colorFilterLabels();

        for (i = this.plot_settings.colorFilters.length-1; i>=0; i--){
            this._bringColorFilterToFront(this.plot_settings.colorFilters[i]);
        };
    },
    setFilterLocation: function(i, x, y){
        _.extend(this.data.settings.filters[i], {"x": x, "y": y});
    },
    setLabelLocation: function(i, x, y){
        _.extend(this.data.settings.labels[i], {"x": x, "y": y});
    },
    layout_filter: function(g, filters, i){
        var self = this,
            settings = this.data.settings.filters[i],
            xOffset = this._filter_left_offset || this.settings.filter_padding,
            nPerCol = Math.ceil(filters.length/settings.columns),
            cols, bb, title, colg;

        cols = _.chain(filters)
                 .groupBy(function(el, j){return Math.floor(j/nPerCol);})
                 .toArray()
                 .value();

        // print header
        title = d3.select(g)
            .append('text')
            .attr("x", xOffset)
            .attr("y", -this.settings.tag_height)
            .attr("text-anchor", "start")
            .attr('class', 'crossview_title')
            .text(filters[0].headerName);

        //build column-groups
        colg = d3.select(g).selectAll("g.crossview_cols")
            .data(cols)
                .enter().append("g")
                .attr('transform', 'translate({0},0)'.printf(xOffset))
                .attr('class', 'crossview_cols')

        //layout text
        colg.selectAll('.crossview_fields')
            .data(function(d){return d;})
            .enter().append("text")
            .attr("x", 0)
            .attr("y", function(d,i){return i*self.settings.tag_height;})
            .attr("text-anchor", "start")
            .attr('class', 'crossview_fields')
            .text(function(v) {return v.text;})
            .on('click', function(v){self.change_active_filters(v, this);})
            .on('mouseover', function(d){
                d3.select(this).attr('fill', self.plot_settings.colorHover);
                self._update_hover_filters(d);})
            .on('mouseout', function(d) {
                d3.select(this).attr('fill', null);
                self._update_hover_filters( );
            });

        // offset filter-column groups to prevent overlap
        colg.each(function(d){
            d3.select(this).attr('transform', 'translate({0},0)'.printf(xOffset))
            xOffset += this.getBBox().width + self.settings.column_padding;
        });

        // set offset for next filter
        bb = g.getBBox();
        this._filter_left_offset = bb.x + bb.width + this.settings.filter_padding;

        // center title-text
        if(settings.columns>1){
            title.attr("x", (bb.x+bb.width/2))
                 .attr("text-anchor", "middle");
        }

        // show helper to indicate draggable
        if(self.options.dev){
            d3.select(g)
                .insert("rect", ":first-child")
                .attr("fill", "orange")
                .attr("opacity", "0.1")
                .attr("x", bb.x)
                .attr("y", bb.y)
                .attr("width", bb.width)
                .attr("height", bb.height)
                .attr("cursor", "pointer")
                .append("svg:title").text(function(d) { return "drag to reposition"; });
        }
    },
    draw_text: function(){
        var self = this,
            drag = (this.options.dev) ? HAWCUtils.updateDragLocationTransform(
                    function(x, y){
                        self.setFilterLocation($(this).index(), x, y);
                    }) : function(){};

        this.vis.append("g")
            .attr('class', 'filter_holder')
            .selectAll('g.filter')
                .data(this.filters)
            .enter().append('g')
            .attr('class', 'filter')
            .attr('transform', function(d,i){
                var x = self.data.settings.filters[i].x||0,
                    y = self.data.settings.filters[i].y||0;
                return 'translate({0},{1})'.printf(x, y);
            })
            .each(function(d, i){ self.layout_filter(this, d, i); })
            .call(drag);
    },
    isMatch: function(val, txt){
        // use as a filter to determine match-criteria
        return (val instanceof Array) ? val.indexOf(txt)>=0 : val === txt;
    },
    change_show_selected_fields: function(path, v, hover_on){
        // Highlight all filters for path currently being hovered
        var self = this,
            filterMatches = function(filter){
                return self.isMatch(v[0].filters[filter.field], filter.text);
            };

        // IE bug with mouseover events: http://stackoverflow.com/questions/3686132/
        if (hover_on && d3.select(path).classed('crossview_path_hover')) return;

        // only show if the field is a selected subset, if selected subset exists
        if (this.path_subset && (!d3.select(path).classed('crossview_selected'))) return;

        d3.select(path).classed('crossview_path_hover', hover_on).moveToFront();
        d3.select(this.svg).selectAll('.crossview_fields')
            .attr('fill', null)
            .classed('crossview_path_hover', false);

        if(hover_on){
            d3.select(this.svg).selectAll('.crossview_fields')
                .filter(filterMatches)
                .attr("fill", this.plot_settings.colorHover)
                .classed('crossview_path_hover', true);
        }
    },
    change_active_filters: function(v, text){
        // check if filter already on; if on then turn off, else add
        var idx = this.active_filters.indexOf(v),
            isNew = (idx<0),
            color;

        if(isNew){
            this.active_filters.push(v);
            color = this.plot_settings.colorSelected;
        } else {
            color = null;
            this.active_filters.splice(idx, 1);
        }

        d3.select(text)
            .classed('crossview_selected', isNew)
            .style("fill", color)
            .classed('crossview_hover', false);

        this._update_selected_filters();
    },
    _update_selected_filters: function(){
        // find all paths which match all selected-filters.
        var self = this,
            paths = d3.select(this.svg).selectAll('.crossview_paths');

        d3.select(this.svg).selectAll('.crossview_paths')
            .each(function(d){d[0].currentStroke = d[0].baseStroke;})
            .style("stroke", null)
            .classed('crossview_selected', false);
        this.path_subset = undefined;

        if(this.active_filters.length>0){
            this.active_filters.forEach(function(filter){
                paths = paths.filter(function(d){return self.isMatch(d[0].filters[filter.field], filter.text);});
            });
            paths.classed('crossview_selected', true)
                .each(function(d){d[0].currentStroke = self.plot_settings.colorSelected;})
                .moveToFront();
            this.path_subset = paths;
        }

        this._update_hover_filters();
    },
    _update_hover_filters: function(hover_filter){
        // if a hover_filter exists, toggle hover-css for selected paths
        var self = this,
            paths = this.path_subset || d3.select(this.svg).selectAll('.crossview_paths'),
            isMatching = function(d){
                return self.isMatch(d[0].filters[hover_filter.field], hover_filter.text);
            };

        d3.select(this.svg).selectAll('.crossview_paths')
            .style("stroke", function(d){return d[0].currentStroke;})
            .classed('crossview_hover', false);

        if(hover_filter){
            paths.filter(isMatching)
                .style("stroke", this.plot_settings.colorHover)
                .classed('crossview_hover', true)
                .moveToFront();
        }
    }
});


RoBHeatmap = function(data){
    Visual.apply(this, arguments);
    var studies = _.map(data.studies, function(d){return new Study(d);});
    this.roba = new RiskOfBiasAggregation(studies);
    delete this.data.studies;
};
_.extend(RoBHeatmap.prototype, Visual.prototype, {
    displayAsPage: function($el, options){
        var title = $("<h1>").text(this.data.title),
            caption = new SmartTagContainer($('<div>').html(this.data.caption)),
            $plotDiv = $('<div>'),
            data = this.getPlotData();

        options = options || {};

        if (window.isEditable) title.append(this.addActionsMenu());

        $el.empty().append($plotDiv);
        if (!options.visualOnly) $el.prepend(title).append(caption.getEl());

        new RoBHeatmapPlot(this, data, options).render($plotDiv);
        caption.ready();
        return this;
    },
    displayAsModal: function(options){
        options = options || {};

        var self = this,
            data = this.getPlotData(),
            caption = new SmartTagContainer($('<div>').html(this.data.caption)),
            $plotDiv = $('<div>'),
            modal = new HAWCModal();

        modal.getModal().on('shown', function(){
            new RoBHeatmapPlot(self, data, options).render($plotDiv);
            caption.ready();
        });

        modal.addHeader($('<h4>').text(this.data.title))
            .addBody([$plotDiv, caption.getEl()])
            .addFooter("")
            .show({maxWidth: 1200});
    },
    getPlotData: function(){
        return {
            aggregation: this.roba,
            settings: this.data.settings
        }
    }
});


RoBHeatmapPlot = function(parent, data, options){
    // heatmap of risk-of-bias information. Criteria are on the y-axis,
    // and studies are on the x-axis
    D3Visualization.apply(this, arguments);
    this.setDefaults();
    this.modal = new HAWCModal();
};
_.extend(RoBHeatmapPlot.prototype, D3Plot.prototype, {
    render: function($div){
        this.plot_div = $div.html('');
        this.processData();
        if(this.dataset.length === 0){
            return this.plot_div.html("<p>Error: no studies with risk-of-bias selected. Please select at least one study with risk-of-bias.</p>");
        }
        this.get_plot_sizes();
        this.build_plot_skeleton(false);
        this.add_axes();
        this.draw_visualization();
        this.resize_plot_dimensions();
        this.add_menu();
        this.build_labels();
        this.build_legend();
        this.trigger_resize();
    },
    get_plot_sizes: function(){
        this.w = this.cell_size*this.xVals.length;
        this.h = this.cell_size*this.yVals.length;
        var menu_spacing = 40;
        this.plot_div.css({'height': (this.h + this.padding.top + this.padding.bottom +
            menu_spacing) + 'px'});
    },
    setDefaults: function(){
        _.extend(this, {
            firstPass: true,
            padding: {},
            x_axis_settings: {
                scale_type: 'ordinal',
                text_orient: "top",
                axis_class: 'axis x_axis',
                gridlines: true,
                gridline_class: 'primary_gridlines x_gridlines',
                axis_labels: true,
                label_format: undefined //default
            },
            y_axis_settings: {
                scale_type: 'ordinal',
                text_orient: 'left',
                axis_class: 'axis y_axis',
                gridlines: true,
                gridline_class: 'primary_gridlines x_gridlines',
                axis_labels: true,
                label_format: undefined //default
            }
        });
    },
    processData: function(){

        var dataset = [], studies, metrics, xIsStudy;

        _.each(this.data.aggregation.metrics_dataset, function(metric){
            _.each(metric.rob_scores, function(rob){
                dataset.push({
                    riskofbias:      rob,
                    study:              rob.study,
                    study_label:        rob.study.data.short_citation,
                    metric:             rob.data.metric,
                    metric_label:       rob.data.metric.metric,
                    score:              rob.data.score,
                    score_text:         rob.data.score_text,
                    score_color:        rob.data.score_color,
                    score_text_color:   rob.data.score_text_color
                });
            })
        });

        studies = _.chain(dataset)
                   .map(function(d){return d.study_label;})
                   .uniq()
                   .value();

        metrics = _.chain(dataset)
                   .map(function(d){return d.metric_label;})
                   .uniq()
                   .value();

        if(this.firstPass){
            _.extend(this.padding, {
                top:             this.data.settings.padding_top,
                right:           this.data.settings.padding_right,
                bottom:          this.data.settings.padding_bottom,
                left:            this.data.settings.padding_left,
                top_original:    this.data.settings.padding_top,
                right_original:  this.data.settings.padding_right,
                left_original:   this.data.settings.padding_left,
            });
            this.firstPass = false;
        }

        xIsStudy = (this.data.settings.x_field!=="metric");

        _.extend(this,{
            cell_size: this.data.settings.cell_size,
            dataset: dataset,
            studies: studies,
            metrics: metrics,
            title_str: this.data.settings.title,
            x_label_text: this.data.settings.xAxisLabel,
            y_label_text: this.data.settings.yAxisLabel,
            xIsStudy: xIsStudy,
            xVals: (xIsStudy)  ? studies : metrics,
            yVals: (!xIsStudy) ? studies : metrics,
            xField: (xIsStudy)  ? "study_label" : "metric_label",
            yField: (!xIsStudy) ? "study_label" : "metric_label"
        });
    },
    add_axes: function() {
        _.extend(this.x_axis_settings, {
            domain: this.xVals,
            rangeRound: [0, this.w],
            number_ticks: this.xVals.length,
            x_translate: 0,
            y_translate: 0
        });

        _.extend(this.y_axis_settings, {
            domain: this.yVals,
            rangeRound: [0, this.h],
            number_ticks: this.yVals.length,
            x_translate: 0,
            y_translate: 0
        });

        this.build_y_axis();
        this.build_x_axis();

        d3.select(this.svg).selectAll('.x_axis text')
            .style("text-anchor", "start")
            .attr("dx", "5px")
            .attr("dy", "0px")
            .attr("transform", "rotate(-25)");
    },
    draw_visualization: function(){
        var self = this,
            x = this.x_scale,
            y = this.y_scale,
            width = this.cell_size,
            half_width = width/2,
            showSQs = function(v){
                self.print_details(self.modal.getBody(), $(this).data('robs'))
                self.modal
                    .addHeader('<h4>Risk-of-bias details: {0}</h4>'.printf(this.textContent))
                    .addFooter("")
                    .show({maxWidth: 900});
            }, getMetricSQs = function(i, v){
                var vals = self.dataset.filter(function(e,i,a){return e.metric_label===v.textContent;});
                vals = vals.map(function(v){return v.riskofbias;});
                $(this).data('robs', {type: 'metric', robs: vals});
            }, getStudySQs = function(i, v){
                var vals = self.dataset.filter(function(e,i,a){return e.study_label===v.textContent;});
                vals = vals.map(function(v){return v.riskofbias;});
                $(this).data('robs', {type: 'study', robs: vals});
            }, hideHovers = function(v){self.draw_hovers(this, {draw: false});}

        this.cells_group = this.vis.append("g");

        this.cells = this.cells_group.selectAll("svg.rect")
            .data(this.dataset)
          .enter().append("rect")
            .attr("x", function(d){return x(d[self.xField]);})
            .attr("y", function(d){return y(d[self.yField]);})
            .attr("height", width)
            .attr("width", width)
            .attr("class", "heatmap_selectable")
            .style('fill', function(d){return d.score_color;})
        .on('mouseover', function(v,i){self.draw_hovers(v, {draw: true, type: 'cell'});})
        .on('mouseout', function(v,i){self.draw_hovers(v, {draw: false});})
        .on('click', function(v){
            self.print_details(self.modal.getBody(), {type: 'cell', robs: [v]})
            self.modal
                .addHeader('<h4>Risk-of-bias details</h4>')
                .addFooter("")
                .show({maxWidth: 900});
        });
        this.score = this.cells_group.selectAll("svg.text")
            .data(this.dataset)
            .enter().append("text")
                .attr("x", function(d){return (x(d[self.xField]) + half_width);})
                .attr("y", function(d){return (y(d[self.yField]) + half_width);})
                .attr("text-anchor", "middle")
                .attr("dy", "3.5px")
                .attr("class", "centeredLabel")
                .style("fill",  function(d){return d.score_text_color;})
                .text(function(d){return d.score_text;});

        $('.x_axis text').each( (this.xIsStudy) ? getStudySQs : getMetricSQs )
            .attr('class', 'heatmap_selectable')
            .on('mouseover', function(v){self.draw_hovers(this, {draw: true, type: 'column'});})
            .on('mouseout', hideHovers)
            .on('click', showSQs);

        $('.y_axis text').each( (!this.xIsStudy) ? getStudySQs : getMetricSQs )
            .attr('class', 'heatmap_selectable')
            .on('mouseover', function(v){self.draw_hovers(this, {draw: true, type: 'row'});})
            .on('mouseout', hideHovers)
            .on('click', showSQs);

        this.hover_group = this.vis.append("g");
    },
    resize_plot_dimensions: function(){
        // Resize plot based on the dimensions of the labels.
        var ylabel_height = this.vis.select('.x_axis').node().getBoundingClientRect().height,
            ylabel_width = this.vis.select('.x_axis').node().getBoundingClientRect().width,
            xlabel_width = this.vis.select('.y_axis').node().getBoundingClientRect().width;

        if ((this.padding.top < this.padding.top_original + ylabel_height) ||
            (this.padding.left < this.padding.left_original + xlabel_width) ||
            (this.padding.right < ylabel_width - this.w + this.padding.right_original)){

            this.padding.top = this.padding.top_original + ylabel_height;
            this.padding.left = this.padding.left_original + xlabel_width;
            this.padding.right = ylabel_width - this.w + this.padding.right_original;
            this.render(this.plot_div);
        }
    },
    draw_hovers: function(v, options){
        if (this.hover_study_bar) this.hover_study_bar.remove();
        if (!options.draw) return;

        var draw_type;
        switch (options.type){
            case 'cell':
                draw_type = {
                    x: this.x_scale(v[this.xField]),
                    y: this.y_scale(v[this.yField]),
                    height: this.cell_size,
                    width: this.cell_size};
                break;
            case 'row':
                draw_type = {
                    x: 0,
                    y: this.y_scale(v.textContent),
                    height: this.cell_size,
                    width: this.w};
                break;
            case 'column':
                draw_type = {
                    x: this.x_scale(v.textContent),
                    y: 0,
                    height: this.h,
                    width: this.cell_size};
                break;
        }

        this.hover_study_bar = this.hover_group.selectAll("svg.rect")
            .data([draw_type])
            .enter().append("rect")
                .attr("x", function(d){return d.x;})
                .attr("y", function(d){return d.y;})
                .attr("height", function(d){return d.height;})
                .attr("width", function(d){return d.width;})
                .attr('class', 'heatmap_hovered');
    },
    build_labels: function(){

        var svg = d3.select(this.svg),
            visMidX = parseInt(this.svg.getBoundingClientRect().width/2, 10),
            visMidY = parseInt(this.svg.getBoundingClientRect().height/2, 10),
            midX = d3.mean(this.x_scale.range());
            midY = d3.mean(this.y_scale.range());

        svg.append("svg:text")
            .attr("x", visMidX)
            .attr("y", 25)
            .text(this.title_str)
            .attr("text-anchor", "middle")
            .attr("class","dr_title");

        var xLoc = this.padding.left + midX+20,
            yLoc = visMidY*2-5;

        svg.append("svg:text")
            .attr("x", xLoc)
            .attr("y", yLoc)
            .text(this.x_label_text)
            .attr("text-anchor", "middle")
            .attr("class","dr_axis_labels x_axis_label");

        var yLoc = this.padding.top + midY;

        svg.append("svg:text")
            .attr("x", 15)
            .attr("y", yLoc)
            .attr("transform",'rotate(270, {0}, {1})'.printf(15, yLoc))
            .text(this.y_label_text)
            .attr("text-anchor", "middle")
            .attr("class","dr_axis_labels y_axis_label");
    },
    build_legend: function(){
        // and move to RiskOfBias or some other object
        if (this.legend_group || !this.data.settings.show_legend) return;

        var self = this,
            svg = d3.select(this.svg),
            svgW = parseInt(svg.attr('width'), 10),
            svgH = parseInt(svg.attr('height'), 10),
            x = this.data.settings.legend_x,
            y = this.data.settings.legend_y,
            fields = _.map(RiskOfBias.score_values, function(v){
                return {
                        value:          v,
                        color:          RiskOfBias.score_shades[v],
                        text_color:     String.contrasting_color(RiskOfBias.score_shades[v]),
                        text:           RiskOfBias.score_text[v],
                        description:    RiskOfBias.score_text_description[v],
                }
            }),
            width = 22,
            half_width = width/2,
            buff = 5,
            title_offset = 8,
            dim = this.svg.getBBox(),
            cursor = (this.options.dev) ? "pointer" : "auto",
            drag = (this.options.dev) ? HAWCUtils.updateDragLocationTransform(function(x, y){
                      self.data.settings.legend_x = parseInt(x, 10);
                      self.data.settings.legend_y = parseInt(y, 10);
                    }) : function(){},
            title;

        // create a new g.legend_group object on the main svg graphic
        this.legend_group = svg.append("g")
                .attr("transform", "translate({0}, {1})".printf(x, y)
                ).attr("cursor", cursor)
                .call(drag);

        // add the text "Legend"; we set the x to a temporarily small value,
        // which we change below after we know the size of the legend
        title = this.legend_group.append("text")
             .attr("x", 10)
             .attr("y", 8)
             .attr("text-anchor", "middle")
             .attr("class", "dr_title")
             .text(function(d){return "Legend"});

        // Add the color rectangles
        this.legend_group.selectAll("svg.rect")
            .data(fields)
          .enter().append("rect")
            .attr("x", function(d, i){return 0;})
            .attr("y", function(d, i){return i*width + title_offset;})
            .attr("height", width)
            .attr("width", width)
            .attr("class", "heatmap_selectable")
            .style('fill', function(d){return d.color;})

        // Add text label (++, --, etc.)
        this.legend_group.selectAll("svg.text.labels")
            .data(fields)
          .enter().append("text")
             .attr("x", function(d, i){return half_width;})
             .attr("y", function(d, i){return i*width + half_width + title_offset;})
             .attr("text-anchor", "middle")
             .attr("dy", "3.5px")
             .attr("class", "centeredLabel")
             .style("fill",  function(d){return d.text_color;})
             .text(function(d){return d.text;});

         // Add text description
         this.legend_group.selectAll("svg.text.desc")
            .data(fields)
          .enter().append("text")
             .attr("x", function(d, i){return width+5;})
             .attr("y", function(d, i){return i*width + half_width + title_offset;})
             .attr("dy", "3.5px")
             .attr("class", "dr_axis_labels")
             .text(function(d){return d.description;});

        // add bounding-rectangle around legend
        dim = this.legend_group.node().getBBox();
        this.legend_group.insert("svg:rect", ":first-child")
            .attr("class","legend")
            .attr("x", -buff)
            .attr("y", -buff)
            .attr("height", dim.height+2*buff)
            .attr("width", dim.width);

        // center the legend-text
        title.attr('x', dim.width/2);

        // set legend in-bounds if out of svg boundaries
        if (x+dim.width > svgW) x = svgW - dim.width - buff;
        if (x < 0) x = 2 * buff;
        if (y+dim.height > svgH) y = svgH - dim.height - 2 * buff;
        if (y < 0) y = 2 * buff;
        this.legend_group.attr("transform", "translate({0}, {1})".printf(x, y));
    },
    print_details: function($div, d){
        var content = [];

        switch (d.type){
            case 'cell':
                content.push(d.robs[0].riskofbias.build_details_div({show_study: true}));
                break;
            case 'study':
                content.push(RiskOfBias.build_metric_comparison_div(d.robs));
                break;
            case 'metric':
                content.push(RiskOfBias.build_study_comparison_div(d.robs));
                break;
        }

        RiskOfBias.display_details_divs($div, content);
    }
});


RoBBarchart = function(data){
    RoBHeatmap.apply(this, arguments);
};
_.extend(RoBBarchart.prototype, Visual.prototype, {
    displayAsPage: function($el, options){
        var title = $("<h1>").text(this.data.title),
            caption = new SmartTagContainer($('<div>').html(this.data.caption)),
            $plotDiv = $('<div>'),
            data = this.getPlotData();

        options = options || {};

        if (window.isEditable) title.append(this.addActionsMenu());

        $el.empty().append($plotDiv);
        if (!options.visualOnly) $el.prepend(title).append(caption.getEl());

        new RoBBarchartPlot(this, data, options).render($plotDiv);
        caption.ready();
        return this;
    },
    displayAsModal: function(options){
        options = options || {};

        var self = this,
            data = this.getPlotData(),
            caption = new SmartTagContainer($('<div>').html(this.data.caption)),
            $plotDiv = $('<div>'),
            modal = new HAWCModal();

        modal.getModal().on('shown', function(){
            new RoBBarchartPlot(self, data, options).render($plotDiv);
            caption.ready();
        });

        modal.addHeader($('<h4>').text(this.data.title))
            .addBody([$plotDiv, caption.getEl()])
            .addFooter("")
            .show({maxWidth: 1200});
    },
    getPlotData: function(){
        return {
            aggregation: this.roba,
            settings: this.data.settings
        }
    }
});


RoBBarchartPlot = function(parent, data, options){
    // stacked-bars of risk-of-bias information. Criteria are on the y-axis,
    // and studies are on the x-axis
    D3Visualization.apply(this, arguments);
    this.setDefaults();
};
_.extend(RoBBarchartPlot.prototype, D3Plot.prototype, {
    render: function($div){
        this.plot_div = $div.html('');
        this.processData();
        if(this.dataset.length === 0){
            return this.plot_div.html("<p>Error: no studies with risk-of-bias selected. Please select at least one study with risk-of-bias.</p>");
        }
        this.get_plot_sizes();
        this.build_plot_skeleton(true);
        this.add_axes();
        this.draw_visualizations();
        this.resize_plot_dimensions();
        this.trigger_resize();
        this.build_labels();
        this.add_menu();
        RoBHeatmapPlot.prototype.build_legend.call(this);
    },
    resize_plot_dimensions: function(){
        // Resize plot based on the dimensions of the labels.
        var xlabel_width = this.vis.select('.y_axis').node().getBoundingClientRect().width;
        if (this.padding.left < this.padding.left_original + xlabel_width) {
            this.padding.left = this.padding.left_original + xlabel_width;
            this.render(this.plot_div);
        }
    },
    get_plot_sizes: function(){
        this.h = this.row_height * this.metrics.length;
        var menu_spacing = 40;
        this.plot_div.css({'height': (this.h + this.padding.top + this.padding.bottom +
            menu_spacing) + 'px'});
    },
    setDefaults: function(){
        _.extend(this, {
            firstPass: true,
            padding: {},
            x_axis_settings: {
                domain: [0, 1],
                scale_type: "linear",
                text_orient: "bottom",
                axis_class: "axis x_axis",
                gridlines: true,
                gridline_class: 'primary_gridlines x_gridlines',
                axis_labels: true,
                label_format: d3.format(".0%")
            },
            y_axis_settings: {
                scale_type: 'ordinal',
                text_orient: 'left',
                axis_class: 'axis y_axis',
                gridlines: true,
                gridline_class: 'primary_gridlines x_gridlines',
                axis_labels: true,
                label_format: undefined //default
            },
            color_scale: d3.scale.ordinal().range(_.values(RiskOfBias.score_shades))
        });
    },
    processData: function(){

        var dataset = [],
            stack_order = ["N/A", "--", "-", "+", "++"],
            metrics, stack;

        _.each(this.data.aggregation.metrics_dataset, function(metric){

            var vals = {"metric_label": metric.rob_scores[0].data.metric.metric,
                        "N/A":0, "--":0, "-":0, "+":0, "++":0},
                weight = 1/metric.rob_scores.length;
            metric.rob_scores.forEach(function(rob){
                vals[rob.data.score_text] += weight;
            });
            dataset.push(vals);

        });

        metrics = _.chain(dataset)
                   .map(function(d){return d.metric_label;})
                   .uniq()
                   .value();

        stack = d3.layout.stack()(
            _.map(stack_order, function(score){
                return _.map(dataset, function(d){
                    return {x: d.metric_label, y: d[score]};
                });
            })
        );

        if(this.firstPass){
            _.extend(this.padding, {
                top:             this.data.settings.padding_top,
                right:           this.data.settings.padding_right,
                bottom:          this.data.settings.padding_bottom,
                left:            this.data.settings.padding_left,
                left_original:   this.data.settings.padding_left,
            });
            this.firstPass = false;
        }

        _.extend(this,{
            w:              this.data.settings.plot_width,
            row_height:     this.data.settings.row_height,
            dataset:        dataset,
            metrics:        metrics,
            stack_order:    stack_order,
            stack:          stack,
            title_str:      this.data.settings.title,
            x_label_text:   this.data.settings.xAxisLabel,
            y_label_text:   this.data.settings.yAxisLabel,
        });
    },
    add_axes: function(){
        _.extend(this.x_axis_settings, {
            rangeRound: [0, this.w],
            number_ticks: 5,
            x_translate: 0,
            y_translate: this.h
        });

        _.extend(this.y_axis_settings, {
            domain: this.metrics,
            number_ticks: this.metrics.length,
            rangeRound: [0, this.h],
            x_translate: 0,
            y_translate: 0
        });

        this.build_y_axis();
        this.build_x_axis();
    },
    draw_visualizations: function(){
        var self = this,
            x = this.x_scale,
            y = this.y_scale,
            colors = this.color_scale,
            fmt = d3.format('%'),
            groups, rects, labels;

        this.bar_group = this.vis.append("g");

        // Add a group for each score.
        groups = this.vis.selectAll("g.score")
            .data(this.stack)
            .enter().append("svg:g")
            .attr("class", "score")
            .style("fill", function(d, i){return colors(i);})
            .style("stroke", function(d, i){return d3.rgb(colors(i)).darker();});

        // Add a rect for each score.
        rects = groups.selectAll("rect")
            .data(Object)
            .enter().append("svg:rect")
            .attr("x", function(d) { return x(d.y0); })
            .attr("y", function(d) { return y(d.x)+5; })
            .attr("width", function(d) { return x(d.y); })
            .attr("height", 20);

        if(this.data.settings.show_values){
            labels = groups.selectAll("text")
                .data(Object)
                .enter().append("text")
                .attr("class", "centeredLabel")
                .style("fill", "#555")
                .attr("x", function(d){return (x(d.y0) + x(d.y)/2);})
                .attr("y", function(d){return (y(d.x)+20);})
                .text(function(d){return (d.y>0) ? fmt(d.y) : "";});
        }
    },
    build_labels: function(){

        var svg = d3.select(this.svg),
            x, y;

        x = parseInt(this.svg.getBoundingClientRect().width / 2, 10);
        y = 25;
        svg.append("svg:text")
            .attr("x", x)
            .attr("y", y)
            .text(this.title_str)
            .attr("text-anchor", "middle")
            .attr("class","dr_title");

        x = this.w / 2;
        y = this.h + 30;
        this.vis.append("svg:text")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "middle")
            .attr("class","dr_axis_labels x_axis_label")
            .text(this.x_label_text);

        x = -this.padding.left + 15;
        y = this.h / 2;
        this.vis.append("svg:text")
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "middle")
            .attr("transform",'rotate(270, {0}, {1})'.printf(x, y))
            .attr("class","dr_axis_labels x_axis_label")
            .text(this.y_label_text);
    }
});
