$.widget('upcycle.facetlist', {
	'options': {
		'templatesNamespace': 'upcycle.templates',
		'facets': [],
		'localizeLabels': true,
		'label': 'FACETLIST_LABEL'
	},
	'_create': function(){
		this._on({'click [role="button"][data-action="remove"]': this._onRemove});
		// this.element.addClass('up-facetlist');
		this._render();
	},
	'_render': function(){
		this.element.html(this._getMarkup());
		return this;
	},
	'add': function(facetsToAdd, options){
		facetsToAdd = _.isArray(facetsToAdd) ? facetsToAdd : _.isObject(facetsToAdd) ? [facetsToAdd] : [];
		options = options || {};
		var facets = this.options.facets,
			added = [];
		_(facetsToAdd).each(function(facetToAdd){
			var existing = _(facets).findWhere({'name': facetToAdd.name}),
				preExistingOptionsLength;
			if(existing){
				preExistingOptionsLength = existing.options.length;
				existing.options = _(existing.options.concat(facetToAdd.options)).uniq();
				if(preExistingOptionsLength < existing.options.length)
					added.push(facetToAdd);
			}else{
				facets.push(facetToAdd);
				added.push(facetToAdd);
			}
		}, this);
		if(added.length && !options.silent){
			this._trigger(':facets:add', null, {
				'facets': added
			});
		}
		return this._setOption('facets', facets, options);
	},
	// 'remove': function(facetsToRemove, options){
	// 	facetsToRemove = _.isArray(facetsToRemove) ? facetsToRemove : _.isObject(facetsToRemove) ? [facetsToRemove] : [];
	// 	options = options || {};
	// 	var remainingOptions,
	// 		removed = [],
	// 		facets = _(this.options.facets).reject(function(facet){
	// 			var remove = _(facetsToRemove).findWhere({'name': facet.name});
	// 			if(remove){
	// 				remainingOptions = _(facet.options).difference(remove.options);
	// 				if(!remainingOptions.length){
	// 					removed.push(facet);
	// 					return true;
	// 				}
	// 				facet.options = remainingOptions;
	// 			}
	// 		}, this);
	// 	if(removed.length && !options.silent){
	// 		this._trigger(':facets:remove', null, {
	// 			'facets': removed
	// 		});
	// 	}
	// 	return this._setOption('facets', facets, options);
			
	// },
	'remove': function(facetsToRemove, options){
		var removed = [],
			facets = this.options.facets,
			match;
		options = options || {};
		facetsToRemove = _.isArray(facetsToRemove) ? facetsToRemove : _.isObject(facetsToRemove) ? [facetsToRemove] : [];
		_(facetsToRemove).each(function(facetToRemove){
			match =  _(facets).findWhere({'name': facetToRemove.name});
			if(match){
				var toRemoveOptions = _.intersection(facetToRemove.options, match.options);
				match.options = _.difference(facetToRemove.options, match.options);
				facetToRemove.options = toRemoveOptions;
				if(!match.options.length){
					facets = _(facets).without(match);
				}
				removed.push(facetToRemove);
			}
		});
		if(removed.length && !options.silent){
			this._trigger(':facets:remove', null, {
				'facets': removed
			});
		}
		return this._setOption('facets', facets, options);
	},
	'reset': function(facets, options){
		options = options || {};
		if(!options.silent){
			if(this.options.facets.length){
				this._trigger(':facets:remove', null, {
					'facets': this.options.facets
				});
			}
			if(facets && facets.length){
				this._trigger(':facets:add', null, {
					'facets': facets
				});
			}
		}
		return this._setOption('facets', facets || [], options);
	},
	'_setOption': function(key, value, options){
		this._super(key, value);
		options = options || {};
		if(key === 'facets'){
			this._render();
			if(!options.silent){
				this._trigger(':facets:changed', null, {
					'facets': this.options.facets
				});
			}
		}
		return this;
	},
	'_onRemove': function(event){
		var $item = $(event.currentTarget).parent(),
			facetAtts = this._getFacetAtts($item);
		return this.remove({
			'name': facetAtts.name,
			'options': [facetAtts.option]
		});
	},
	'_getFacetAtts': function(element){
		element = element instanceof $ ? element.get(0) : element;
		return {
			'name': element.getAttribute('data-facet'),
			'option': element.getAttribute('data-facet-option')
		};
	},
	'_getMarkup': function(){
		var template = eval(this.options.templatesNamespace)['facetlist'];
		return template(this._getTemplateContext(this.options));
	},
	'_getTemplateContext': function(options){
		var context = _({}).extend(options);
		if(this.options.localizeLabels){
			_(context).extend({
				'label': $.i18n.prop(options.label)
			});
		}
		return context;
	}
});