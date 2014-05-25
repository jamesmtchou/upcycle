(function($){
	$.fn.positionRelativeTo = function( obj ){
		var $trg = ( obj instanceof jQuery ) ? obj : $(obj),
			$context = this,
			trgPos = {top:0, left:0}, pos;
		var safety = -100;
		do{
			pos = $context.position();
			trgPos.top += pos.top;
			trgPos.left += pos.left;
			$context = $context.offsetParent();
			safety++;
		}while( $trg.length && !$context.is($trg) && !$context.is('body') );
		return trgPos;
	};
	$.fn.countSamePositionY = function(stopAt){
		var positions = [], toc = {}, top;
		$.each(this, function(){
			top = $(this).position().top;
			if( !toc.hasOwnProperty(top) ){
				if( stopAt && stopAt === positions.length )
					return false;
				toc[top] = true;
				positions.push({'top': top, 'count': 1});
			}else{
				positions[positions.length - 1].count++;
			}
		});
		return positions;
	};
})(jQuery);
$.widget('upcycle.base', {
	'options':{
		'templatesNamespace': 'upcycle.templates',
		'templateName': '',
		'localizeLabels': true
	},
	'_create': function(){
		this.element.addClass(this.widgetFullName);
	},
	'_getMarkup': function(){
		var template = this._getTemplate();
		return template(this._getTemplateContext.apply(this, arguments));
	},
	'_getTemplate': function(templateName){
		return eval(this.option('templatesNamespace'))[templateName || this.option('templateName')];
	}
});
$.widget('upcycle.facetlist', $.upcycle.base, {
	'options': {
		'templatesNamespace': 'upcycle.templates',
		'templateName': 'facetlist',
		'facets': [],
		'moreLessMin': 4,
		'moreLessLinkContainer': null,
		'moreLessOpenByDefault': false,
		'localizeLabels': true,
		'label': 'FACETLIST_LABEL'
	},
	'_create': function(){
		this._super();
		this._on({'click [role="button"][data-action="remove"]': this._onRemove});
		this.element.addClass('up-facetlist');
		this._render();
	},
	'_render': function(){
		this.element.html(this._getMarkup(this.options));
		return this.update();
	},
	'update': function(){
		/**
		 * More/Less
		 */
		var $facets = this.element.find('.up-facets')
		
		$facets.moreless({
			'minItems': this.options.moreLessMin,
			'linkContainer': this.options.moreLessLinkContainer,
			'openByDefault': this.options.moreLessOpenByDefault
		});
		
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
	'remove': function(facetsToRemove, options){
		facetsToRemove = _.isArray(facetsToRemove) ? facetsToRemove : _.isObject(facetsToRemove) ? [facetsToRemove] : [];
		options = options || {};
		var remainingOptions,
			removedOptions,
			removed = [],
			facets = _(this.options.facets).reject(function(facet){
				var toRemove = _(facetsToRemove).findWhere({'name': facet.name});
				if(toRemove){
					remainingOptions = _(facet.options).difference(toRemove.options);
					removedOptions = _(facet.options).intersection(toRemove.options);
					facet.options = remainingOptions;
					toRemove.options = removedOptions;
					removed.push(toRemove);
					return !remainingOptions.length;
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
		if(key === 'moreLessMin'){
			this._render();
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
$.widget('upcycle.selectlist', $.upcycle.facetlist, {
	'options': {
		'templateName': 'selectlist',
		'eventDelay': 0
	},
	'_create': function(){
		this._super();
		this._setOptions(this.options);
		this._on({'change': this._onSelectionChange});
		this._on({'click [role="facet"] > [role="header"]': this._onToggleFacetHeader});
		this._on({'click button.more, button.less': this.update});
		this.element
			.addClass('up-selectlist')
			.removeClass('up-facetlist'); 
		this._render();
	},
	'_render': function(){
		this.element.html(this._getMarkup(this.options.facets));
		return this.update();
	},
	'update': function(){
		var that = this,
			$scrollArea = this.element.find('.scroll-area'),
			$viewport = $scrollArea.find('.viewport'),
			needsScrollbar = $viewport.prop('scrollHeight') > $viewport.prop('clientHeight'),
			tinyscrollbar = $scrollArea.data('plugin_tinyscrollbar');
		/**
		 * More/Less
		 */
		$viewport.find('.up-facet-options').each(function(){
			var $facetOptions = $(this);
			if( $facetOptions.children().length > 4 ){
				$facetOptions.moreless({
					'minItems': that.options.moreLessMin
				});
			}
		});
		/**
		 * Scrollbar
		 */
		$scrollArea.toggleClass('scrollable', needsScrollbar);
		if(needsScrollbar && !tinyscrollbar){
			$scrollArea.tinyscrollbar();
		}else if(tinyscrollbar){
			tinyscrollbar.update('relative');
		}
		return this;
	},
	'checkboxToggle': function(facets, stateValue, options){
		var $changed = $(),
			$checkboxes = this.element.find('[type="checkbox"]'),
			checked,
			checkbox;
		options = options || {};
		_(facets).each(function(f){
			_(f.options).each(function(o){
				// find reusable solution for selecting attribute values with backslashes?
				o = o.replace(/\\/, '\\\\');
				checkbox = $checkboxes.filter('[data-facet="'+f.name+'"][data-facet-option="'+o+'"]').get(0);
				if(checkbox){
					checked = _.isBoolean(stateValue) ? stateValue : !checkbox.checked;
					if(checked !== checkbox.checked)
						$changed = $changed.add(checkbox);
					checkbox.checked = checked;
				}
			});
		});
		if($changed.length && !options.silent)
			$changed.trigger('change');
		return this;
	},
	'checkboxToggleAll': function(stateValue, options){
		var $changed = $(),
			$checkboxes = this.element.find('[type="checkbox"]'),
			checked;
		options = options || {};
		$checkboxes.each(function(i, checkbox){
			checked = _.isBoolean(stateValue) ? stateValue : !checkbox.checked;
			if(checked !== checkbox.checked)
				$changed = $changed.add(checkbox);
			checkbox.checked = checked;
		});
		if($changed.length && !options.silent)
			this._onSelectionChange(null);
		return this;
	},
	
	'_triggerChangeEvent': function(event, selectedFacets){
		this._trigger(':selection:changed', event, {'facets': selectedFacets});	
	},
	'_setOption': function(key, value){
		this._super(key, value);
		if(key === 'eventDelay'){
			this._debouncedTriggerChangeEvent = _.debounce(this._triggerChangeEvent, this.options.eventDelay);
		}
	},
	'_onToggleFacetHeader': function(event){
		$(event.currentTarget).toggleClass('collapsed');
		this.update();
	},
	'_onSelectionChange': function(event){
		this._debouncedTriggerChangeEvent(event, this._getSelectedFacetList());
	},
	'_getSelectedFacetList': function(){
		var selectedFacets = {},
			selectedFacetList = [],
			facet, name, option;
		this.element.find('[type="checkbox"]').each(function(){
			if( this.checked ){
				name = this.getAttribute('data-facet');
				option = this.getAttribute('data-facet-option');	
				if(selectedFacets.hasOwnProperty(name)){
					selectedFacets[name].push( option );
				}else{
					selectedFacets[name] = [option];
				}
			}
		});
		selectedFacetList = _(selectedFacets).reduce(function(memo, options, name){
			facet = _(this.options.facets).findWhere({'name': name});
			if(facet){
				memo.push({
					'name': facet.name,
					'displayName': facet.displayName,
					'options': options
				});
			}
			return memo;
		}, [], this);
		return selectedFacetList;
	}
});
$.widget('upcycle.editable', $.upcycle.base, {
	'options': {
		'templateName': 'editable',
		'popoverClass': '',
		'popoverContainer': null,
		'popoverPlacement': 'bottom',
		'defaultButtonLabel': 'EDITABLE_DEFAULT_BUTTON_LABEL'
	},
	'_create': function(){
		this._super();
		this._on({
			'click .editable': this._onEditOpen,
			'click [data-action="revert"]': this._onRevert
		});
	},
	'_onEditOpen': function(event){
		event.stopPropagation();
		this._render(event.currentTarget);
	},
	'_onEditChange': function(event, revert){
		var $targetElement = this.$targetElement,
			oldValue, newValue;
		if(revert && $.trim($targetElement.text()) !== this.option('targetElementDefaultValue')){
			oldValue = $.trim($targetElement.text());
			newValue = this.option('targetElementDefaultValue');
		}else if(this.option('targetElementDefaultValue') !== event.target.value){
			oldValue = $.trim($targetElement.text());
			newValue = event.target.value;
		}
		if(newValue){
			$targetElement.text(newValue);

			this._trigger(':value:change', event, {
				'oldValue': oldValue,
				'newValue': newValue,
				'element': $targetElement[0],
				'revert': revert || false
			});
		}
		this._destroy();
	},
	'_onRevert': function(event){
		this._onEditChange(event, true);
	},
	'_render': function(targetElement){
		if(this.$targetElement && this.$targetElement[0] === targetElement)
			return;
		if(this.$targetElement)
			this._destroy();

		var $targetElement = this.$targetElement = $(targetElement),
			widgetFullName = this.widgetFullName,
			popoverClass = this.option('popoverClass');
		$targetElement
			.popover({
				'container': this.option('popoverContainer') || this.element,
				'html': true,
				'placement': this.option('popoverPlacement'),
				'content': this._getMarkup($targetElement)
			})
			.on('show', function(){
				var popover = $(this).data('popover');
				popover.tip()
					.addClass(widgetFullName+'-popover')
					.addClass(popoverClass);
			})
			.popover('show')
			.data('popover')
				.tip()
					.on('change', _.bind(this._onEditChange, this));
		this.option('targetElementDefaultValue', $targetElement.attr('data-default'));
	},
	'_destroy': function(){
		this.$targetElement.data('popover').tip().off();
		this.$targetElement.popover('destroy');
		this.$targetElement = null;
	},
	'_getTemplateContext': function($targetElement){
		var context = {},
			attr = _.bind($targetElement.attr, $targetElement),
			i18n = $.i18n.prop,
			localizeLabels = this.option('localizeLabels');
		if($targetElement){
			context = {
				'newValueLabel': localizeLabels ? i18n(attr('data-new-label')) : attr('data-new-label'),
				'newValuePlaceholder': localizeLabels ? i18n(attr('data-new-placeholder')) : attr('data-new-placeholder'),
				'defaultValueLabel': localizeLabels ? i18n(attr('data-default-label')) : attr('data-default-label'),
				'defaultValue': attr('data-default'),
				'defaultButtonLabel': localizeLabels ? i18n(this.option('defaultButtonLabel')) : this.option('defaultButtonLabel'),
				'currentValueIsDefault': attr('data-default') === $.trim($targetElement.text())
			};
		}
		return context;
	},
});
$.widget('upcycle.filterpanel', $.upcycle.selectlist, {
	'options': {
		'templateName': 'filterpanel',
		'data': [],
		'selectedData': [],
		'localizeLabels': true,
		'label': 'FILTERPANEL_FILTERPANEL',
		'clearAllLabel': 'FILTERPANEL_CLEAR_ALL',
		'resultsLabel': 'FILTERPANEL_RESULTS',
		'resultLabel': 'FILTERPANEL_RESULT'
	},
	'_create': function(){
		this._super();
		this._on({'click [data-action="clear-all"]': function(){this.checkboxToggleAll(false);}});
		this.element
			.addClass('up-filterpanel')
			.removeClass('up-selectlist');
		this._setOptions(this.options);
	},
	'_render': function(){
		this.element.html(this._getMarkup(this.options));
		return this.update();
	},
	'_triggerChangeEvent': function(event, selectedFacets, selectedData){
		this._trigger(':selection:changed', event, {'facets': selectedFacets, 'data': selectedData});	
	},
	'_onSelectionChange': function(event){
		var selectedFacets = this._getSelectedFacetList(),
			selectedData = this._getSelectedData(selectedFacets);
		this._setOption('selectedFacets', selectedFacets);
		this._setOption('selectedData', selectedData);
		this._debouncedTriggerChangeEvent(event, selectedFacets, selectedData);
	},
	'_setOption': function(key, value){
		this._super(key, value);
		if(key === 'data' || key === 'facets'){
			_(this.options.facets).each(function(f){
				if( !_.isEmpty(this.options.data) ){
					var facetOptions = _(this.options.data)
						.chain()
						.pluck(f.name)
						.uniq()
						.value();
					_.extend(f, {'options': facetOptions});
				}
			}, this);
			this._render();
		}
		if(key === 'selectedData'){
			var resultCount = '',
				resultCountLabel;
			if(!_.isEmpty(this.options.selectedFacets) && !_.isEmpty(this.options.data)){
				resultCountLabel = value.length == 1 ? this.options.resultLabel : this.options.resultsLabel;
				resultCount = $.i18n.prop(resultCountLabel, value.length);
			} 
			this.element.find('.up-filterpanel-header .up-filterpanel-result').text(resultCount);
		}
	},
	'_getSelectedData': function(selectedFacets){
		var selectedData = _(this.options.data)
			.chain()
			.filter(function(obj){
				return _(selectedFacets).every(function(facet){
					return _(facet.options).some(function(option){
						var actualValue = obj[facet.name];
						return actualValue == option;
					});
				});
			})
			.value();
		return selectedData;
	},
	'_getMarkup': function(){
		return this._getTemplate()(this._getTemplateContext(this.options));
	},
	'_getTemplateContext': function(options){
		var context = _({
			'selectlist': this._getTemplate('selectlist')(this.options.facets)
		}).extend(options);
		if(this.options.localizeLabels){
			_(context).extend({
				'label': $.i18n.prop(options.label),
				'clearAllLabel': $.i18n.prop(options.clearAllLabel)
			});
		}
		return context;
	}
});
Handlebars.registerHelper('tinyscrollbar', function(){
	var options = arguments[arguments.length - 1];
	var includeScrollArea = arguments.length > 0 ? arguments[0] : false;
	var viewportClasses = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1, arguments.length - 1).join(' ') : '';
	var buffer = '';
	buffer += '<div class="scrollbar disable"><div class="track"><div class="thumb"></div></div></div><div class="viewport' + (viewportClasses ? ' ' + viewportClasses : '') + '"><div class="overview">';
	buffer += options.fn(this);
	buffer += '</div></div>';
	if( includeScrollArea ){
		buffer = '<div class="scroll-area">' + buffer + '</div>';
	}
	return buffer;
});
(function($){

	var defaults = {
		'openByDefault': false,
		'minItems': 2,
		'itemClass': '',
		'more': 'More',
		'less': 'Less',
		'linkContainer': null,
		'linkClass': ''
	},
	internal = {
		'items': function(){
			var $this = this;
			return $this.settings.itemClass ? $this.find('.' + $this.settings.itemClass) : $this.children().not('.less, .more');
		},
		'getSelector': function(obj){
			return obj ? obj instanceof jQuery ? obj : $(obj) : null;
		},
		'getMinItems': function(){
			var $this = this,
				minItems = $this.settings.minItems,
				minItemsByPosition = [];
			if(_.isString(minItems)){
				switch(minItems){
					case "same-y":
						minItemsByPosition = internal.items.call(this).countSamePositionY(1);
						break;
				}
			}
			return minItemsByPosition.length ? minItemsByPosition[0].count : minItems;
		}
	},
	methods = {
		'init': function(options){
			if( $.data(this, 'moreLess') ){
				// already initialized
				return;
			}
			var $this = $(this);
			$this.settings = $.extend({}, defaults, options);
			$this.settings.linkClass = $this.settings.linkClass ? ' ' + $this.settings.linkClass : '';
			$this.$linkContainer = internal.getSelector($this.settings.linkContainer) || $this;
			$this.more = $('<button type="button" class="btn btn-link more'+$this.settings.linkClass+'">'+$this.settings.more+'</button>')
				.click(function(event){
					event.preventDefault();
					methods.more.call($this);
				}).hide();
			$this.less = $('<button type="button" class="btn btn-link less'+$this.settings.linkClass+'">'+$this.settings.less+'</button>')
				.click(function(event){
					event.preventDefault();
					methods.less.call($this);
				}).hide();

			$this.$linkContainer.append( $this.more ).append( $this.less );
			
			$.data(this, 'moreLess', $this);
			methods[$this.settings.openByDefault ? 'more' : 'less'].call($this);
		},
		'destroy': function(){
			var $this = this;
			$this.more.remove();
			$this.less.remove();
		},
		'update': function(){
			var $this = this;
			if( $this.clipItems ){
				methods.less.call($this);
			}
		},
		'less': function(){
			var $this = this,
				$items = internal.items.call($this),
				$item,
				minItems = internal.getMinItems.call(this),
				numberToClip = $items.length - minItems;
			
			$this.less.hide();
			
			if( numberToClip > 0 ){
				$items.each(function(itemIndex, item){
					$item = $(item);
					if( itemIndex === minItems - 1 ){
						$item.addClass('more-less-last');
					}else if( itemIndex >= minItems ){
						$item.hide();
					} 
				});
				if( $this.settings.more )
					$this.more.text( numberToClip + ' ' + $this.settings.more ).show();
					// $this.$linkContainer.append($this.more.text( numberToClip + ' ' + $this.settings.more ));	
				$this.clipItems = true;
			}
		},
		'more': function(){
			var $this = this,
				$items = internal.items.call($this),
				minItems = internal.getMinItems.call($this);
			$items
				.removeClass('more-less-last')
				.show();
			
			$this.more.hide();
			
			if( $items.length > minItems ){
				if( $this.settings.less )
					this.less.show();
				$this.clipItems = false;	
			}
		},
		'toggle': function(){
			methods[this.clipItems ? 'more' : 'less'].call(this);
		}
	};
	var old = $.fn.moreless;
	$.fn.moreless = function(){
		var args = arguments;
		// loop through each element in selector
		$.each(this, function(){
			if( typeof args[0] === 'string' && typeof methods[args[0]] === 'function' ){
				// call api method
				var api = $.data(this, 'moreLess');
				if( api )
					methods[args[0]].apply(api, Array.prototype.splice(args, 1));
			}else if( typeof args[0] === 'object' || !args[0] ){
				// call init method
				methods.init.apply(this, args);
			}	
		});
		return this;
	};
	/* DROPDOWN NO CONFLICT
	 * ==================== */
	$.fn.moreless.noConflict = function(){
		$.fn.moreless = old;
		return this;
	};
  
})(jQuery);
this["upcycle"] = this["upcycle"] || {};
this["upcycle"]["templates"] = this["upcycle"]["templates"] || {};
this["upcycle"]["templates"]["editable"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"bottom\">\n	<div>\n		<span role=\"label\">";
  if (stack1 = helpers.defaultValueLabel) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.defaultValueLabel); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>:<br/>\n		<strong>\"";
  if (stack1 = helpers.defaultValue) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.defaultValue); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\"</strong>\n	</div>\n	<button role=\"button\" data-action=\"revert\" class=\"btn\">";
  if (stack1 = helpers.defaultButtonLabel) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.defaultButtonLabel); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</button>\n</div>\n";
  return buffer;
  }

  buffer += "<form>\n<label>";
  if (stack1 = helpers.newValueLabel) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.newValueLabel); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</label>:<input type=\"text\" placeholder=\"";
  if (stack1 = helpers.newValuePlaceholder) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.newValuePlaceholder); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\"></input>\n</form>\n";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.currentValueIsDefault), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  return buffer;
  });;
this["upcycle"] = this["upcycle"] || {};
this["upcycle"]["templates"] = this["upcycle"]["templates"] || {};
this["upcycle"]["templates"]["facetlist"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n			";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.options), {hash:{},inverse:self.noop,fn:self.programWithDepth(2, program2, data, depth0),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n		";
  return buffer;
  }
function program2(depth0,data,depth1) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n			<li class=\"up-facet\" data-facet=\""
    + escapeExpression(((stack1 = (depth1 && depth1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-facet-option=\"";
  stack2 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\">\n				<span class=\"up-facet-option\">"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</span><button role=\"button\" data-action=\"remove\" class=\"btn up-btn-close-x-small\">remove</button>\n			</li>\n			";
  return buffer;
  }

  buffer += "<div class=\"up-inner\">\n	<span role=\"label\">";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.label); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>\n	<ul role=\"presentation\" class=\"up-facets\">\n		";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.facets), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	</ul>\n</div>";
  return buffer;
  });;
this["upcycle"] = this["upcycle"] || {};
this["upcycle"]["templates"] = this["upcycle"]["templates"] || {};
this["upcycle"]["templates"]["filterpanel"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"up-filterpanel-header\">\n	<div class=\"up-filterpanel-title pull-left\">";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.label); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div><div class=\"up-filterpanel-result pull-left\"></div>\n	<div class=\"pull-right\">\n		<button role=\"button\" data-action=\"clear-all\" class=\"btn-link\">";
  if (stack1 = helpers.clearAllLabel) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.clearAllLabel); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</button>\n		<button data-action=\"close\" class=\"btn up-btn-close-x\">close</button>\n	</div>\n</div>\n<div class=\"up-selectlist\">";
  if (stack1 = helpers.selectlist) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.selectlist); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</div>";
  return buffer;
  });;
this["upcycle"] = this["upcycle"] || {};
this["upcycle"]["templates"] = this["upcycle"]["templates"] || {};
this["upcycle"]["templates"]["selectlist"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n	<ul role=\"presentation\" class=\"up-facets\">\n		";
  stack1 = helpers.each.call(depth0, depth0, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n	</ul>\n	";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n	  		<li role=\"facet\" class=\"up-facet\">\n	  			<div role=\"header\" class=\"up-facet-header\">\n			  		<span role=\"button\" data-action=\"toggle\"></span>\n			  		<span role=\"label\" data-value=\"";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.name); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" class=\"up-facet-label\">";
  if (stack1 = helpers.displayName) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = (depth0 && depth0.displayName); stack1 = typeof stack1 === functionType ? stack1.call(depth0, {hash:{},data:data}) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>\n		  		</div>\n		  		<ul role=\"group\" class=\"up-facet-options\">\n		  			";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.options), {hash:{},inverse:self.noop,fn:self.programWithDepth(3, program3, data, depth0),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n		  		</ul>\n		  	</li>\n		  	";
  stack2 = helpers.unless.call(depth0, ((stack1 = data),stack1 == null || stack1 === false ? stack1 : stack1.last), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  		";
  return buffer;
  }
function program3(depth0,data,depth1) {
  
  var buffer = "", stack1;
  buffer += "\n			  		<li class=\"up-facet-option\">\n			  			<input data-facet=\""
    + escapeExpression(((stack1 = (depth1 && depth1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-facet-option=\""
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "\" type=\"checkbox\">\n			  			<span class=\"up-facet-option-name\">"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</span>\n			  		</li>\n			  		";
  return buffer;
  }

function program5(depth0,data) {
  
  
  return "	\n	  		<li class=\"divider\"></li>\n	  		";
  }

  buffer += "<div class=\"up-inner\">\n	";
  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data};
  if (stack1 = helpers.tinyscrollbar) { stack1 = stack1.call(depth0, options); }
  else { stack1 = (depth0 && depth0.tinyscrollbar); stack1 = typeof stack1 === functionType ? stack1.call(depth0, options) : stack1; }
  if (!helpers.tinyscrollbar) { stack1 = blockHelperMissing.call(depth0, stack1, options); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>";
  return buffer;
  });;