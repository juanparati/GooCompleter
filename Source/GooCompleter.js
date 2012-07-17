/*
---

name: GooCompleter

description: Google style autocompleter for MooTools that use AJAX request.

version: 1.1

license: MIT-style license

authors:
  - Juan Lago

requires: [Core/Class, Core/Object, Core/Element.Event, Core/Element.Event.Delegation, Core/Request.JSON]

provides: [GooCompleter]

...
*/

// GooCompleter class  
var GooCompleter = new Class({
	
	Implements: [Options, Events],
	
	options: {
		action: 'webservice.php',
		param: 'search',
		method: 'post',
		minlen: 0,
		delay: 1000,
		hightlight: true,		
    
		use_typebox: true,
		autoselect_typebox: false,
		clone_typebox: true,
		typebox_offset : {
			x: 0,
			y: 0
		},
    
		use_listbox: true,		
		listbox_offset : {
			x: 1,
			y: 1      
		},    
    
		// Custom events    		          
		onSelected: function(value){}                   
	},
	
	blocked: false,
	suggestions: [],
	
	
	/*
	Constructor: initialize
		Constructor

		Add event on formular and perform some stuff, you now, like settings, ...
	*/
	
	initialize: function (field, options) {
    
		this.field = document.id(field);
    
		this.setOptions(options);  
		
		
		// Disable autocomplete
		this.field.setAttribute('autocomplete', 'off');	

		// Disable auto correct and capitalize on IOS.
		this.field.setAttribute('autocapitalize', 'off');
		this.field.setAttribute('autocorrect', 'off');		
    
				
		// Setup Typebox
		if (this.options.use_typebox)
		{
			this.typebox = new Element('div', {
				'class': 'goocompleter_typebox'				
			}).inject(document.body);			
			
			if (this.options.clone_typebox)
			{
				
				// Set attributes
				this.typebox.setStyles(this.field.getStyles('font-size', 'font-family', 'font-weight', 'line-height', 'text-align', 'vertical-align', 'width', 'height', 'padding', 'border-top', 'border-left', 'border-right', 'border-bottom', 'letter-spacing'));
								
				// Reset border color
				this.typebox.setStyle('border-color', 'transparent');							
								
				// Prevent IE 9 padding positioning bug without CSS
				/*
				if (!Browser.ie9)				
					this.typebox.setStyles(this.field.getStyles('padding-top'));																				
				*/
				
				this.setRelPosition(this.field, this.typebox, this.options.typebox_offset.x, this.options.typebox_offset.y, true);
				
				window.addEvent('resize', function() {
					this.setRelPosition(this.field, this.typebox, this.options.typebox_offset.x, this.options.typebox_offset.y, true);
				}.bind(this));
											
			}
								
			// Prevent focus lost
			this.typebox.addEvent('click', function() {
				this.field.focus();
				
				if (this.options.autoselect_typebox)
					this.field.select();								
					
			}.bind(this));			
					
		}
		
		// Setup Listbox
		if (this.options.use_listbox)
		{
			
			this.listbox = new Element('div', {
				'class': 'goocompleter_listbox'
			}).inject(document.body);
			
			this.setRelPosition(this.field, this.listbox, this.options.listbox_offset.x, this.options.listbox_offset.y, false);
			
			window.addEvent('resize', function() {
				this.setRelPosition(this.field, this.listbox, this.options.listbox_offset.x, this.options.listbox_offset.y, false);
			}.bind(this));					
			
			
			// Add propagated event for list selection
			this.listbox.addEvent('click:relay(li)', function(event, target) {
				
				event.stop();
				
				this.field.set('value', this.normalizeValue(target.get('html')));				
				
				if (this.options.use_typebox)
					this.typebox.empty();
					
				this.listbox.setStyle('display', 'none');	
				
			}.bind(this));
			
			
			// Add propagated event for list over
			this.listbox.addEvent('mouseenter:relay(li)', function(event, target) {
				target.addClass('selected');
			});
			
			
			// Add navigation events
			this.listbox.addEvent('mouseleave:relay(li)', function(event, target) {
				target.removeClass('selected');
			});
			
			
			// Navigate between listbox
			this.field.addEvent('keydown', function(event) {
				
				if (event.key == 'enter')
				{
					this.listbox.setStyle('display', 'none');
					event.stop();
				}
								
				if (event.key == 'up' || event.key == 'down')
				{
					if (this.listbox.getStyle('display') != 'none')	
					{
						var selected = this.navigate(event.key);
						
						if (this.options.use_typebox)
							this.typebox.empty();
							
						this.field.set('value', this.normalizeValue(selected.get('html')));							
						this.fireEvent('onSelected', selected.get('html'));
					}
				
					event.stop();
									
				}
							
			}.bind(this));
			
		}
		
		
		// Retrieve suggestions on keyup
		this.field.addEvent('keyup', function(event) {
			
			var value = this.field.get('value');
			var cachevalues = false;
			
			// Ignore some key events
			if (event.key == 'up' || event.key == 'down' || event.key == 'left' || event.key == 'right' || event.key == 'tab' || event.key == 'enter')
				return false;			
						
									
			// Optimize reponse
			if (this.suggestions.length > 0)
			{				
				cachevalues = this.searchCache(value);				
				
				// Optimize typebox
				if (this.options.use_typebox)
				{															
					if (cachevalues.length > 0 )					
						this.writeTypebox(cachevalues[0]);																			
					else
						this.typebox.empty();																							
				}
			
				// Optimize listbox				
				if (this.options.use_listbox)
				{
					if (cachevalues.length > 0)							
						this.showSuggestions(cachevalues);
					else
						this.listbox.setStyle('display', 'none');		
				}
				
			}
			
			if (value.trim() != '' && value.length > this.options.minlen)
			{							
			
								
				if (this.blocked)				
					clearTimeout(this.timer);									
				else
				{										
					this.blocked = true;																	
				
					this.timer = this.getSuggestions;
					this.timer.delay(this.options.delay, this);					
				}			
					
				
			}
			else
			{
				if (this.options.use_typebox)
					this.typebox.empty();
				
					
				if (this.options.use_listbox)
					this.listbox.setStyle('display', 'none');							
			}
			
			
		}.bind(this));
		
	},
	
	
	/*
	Function: getSuggestions
		Private method
		
		Retrieve a list of suggestions  
	*/
	getSuggestions: function()
	{
				
				
		if (this.field.get('value').trim() != '')
		{
			
			if (this.suggestions[0] != this.field.get('value'))
			{
				var request = new Request.JSON({
					url: this.options.action,
					method: this.options.method,
			
					onSuccess: function(data) {					
						this.suggestions = data;
						this.showSuggestions(this.suggestions);
					}.bind(this)
				});
		
				request.send(this.options.param+'='+this.field.get('value'));
			}
		}
		
		this.blocked = false;
		
	},
	
	/*
	Function: showSuggestions
		Private method
		
		Show a list of suggestions
	*/
	showSuggestions: function(suggestions)
	{
		
		if (suggestions.length > 0)
		{
						
			var style = 'even';
		
			// Delete result list
			if (this.options.use_listbox)
			{
				this.listbox.empty();
			
				new Element('ul').inject(this.listbox);
				this.listbox.setStyle('display', 'block');
			}
			
			// Write typebox suggestion
			if (this.options.use_typebox)						
				this.writeTypebox(suggestions[0]);			
		
				
			Object.each(suggestions, function(value) {
				
				var html_value = value;
			
				// Show new result list
				if (this.options.use_listbox)
				{	
										
					if (this.options.hightlight)
					{
						// This way is more faster than the regular expressions method
						html_value = value.substr(0, this.field.get('value').length) + '<span class="goocompleter_hightlight">';
						html_value = html_value + value.substr(this.field.get('value').length) + '</span>';
						
						//html_value = value.substr(0, this.field.get('value').length) + value.substr(this.field.get('value').length).bold();
					}
								
					
					new Element('li', {
						html: html_value,
						'class': style
					}).inject(this.listbox.getElement('ul'));
				
					style = style == 'even' ? 'odd' : 'even';			
				}								
											
			}.bind(this));
			
								
		}
		else
		{
			// Hide typebox
			if (this.options.use_typebox)
				this.typebox.empty();
			
			// Hide new result list
			if (this.options.use_listbox)			
				this.listbox.setStyle('display', 'none');		
			
		}
		
	},
	
	/* 
	Function: writeTypebox
		Private method
		
		Write a suggestion in the typebox	
	*/
	writeTypebox: function (suggestion) {
		
		var replacement;
				
		replacement = suggestion.substr(this.field.get('value').length);
								
		replacement = '<span class="goocompleter_suggestion">'+replacement+'</span>';
				
		this.typebox.set('html', this.field.get('value')+replacement);	
		
	},
	
	/* 
	Function: searchCache
		Private method
		
		Search a suggestion in cache
	*/
	searchCache: function (search) {
		
		var found = new Array();
		
		Object.each(this.suggestions, function(value) {
			
			if (search.toLowerCase() == value.substr(0, search.length).toLowerCase())								
				found[found.length] = value;
							
		});			
	
		return found;		
	},
	
	
	/* 
	Function: navigate
		Private method
		
		Navigate between listbox
	*/
	navigate: function (key) {				
		
		var selected = false;
		var nodes = this.listbox.getChildren('ul li');
		
		nodes.each(function(el) {
			
			if (!selected && el.hasClass('selected'))
			{
				
				el.removeClass('selected')
				
				if (key == 'up')				
				{
					if (el.getPrevious() == null)									
						selected = nodes[nodes.length - 1]; // getLast() doesn't work!						
					else
						selected = el.getPrevious();					
				}
				
				if (key == 'down')
				{
					if (el.getNext() == null)
						selected = el.getFirst();
					else
						selected = el.getNext();
				}								
								
			}
			
		});
		
		// Select First element by default
		
		if (!selected)
			selected = nodes[0];
		
		selected.addClass('selected');
		
		// Detect scroll
		var scrollsize = this.listbox.getScrollSize();
		var size = this.listbox.getSize();
								
		if (scrollsize.y > size.y)
		{
			// Move scroll to selected element
			this.listbox.scrollTo(0, selected.getPosition().y - this.listbox.getPosition().y);									
			
			//console.log(selected.getPosition(this.listbox).y);
			
		}
		
		return selected;
				
	},
	
	/* 
	Function: normalizeValue
		Private method
		
		Normalize a value from a list box (strip html)
	*/
	normalizeValue: function(value) {
		
		// We could use stripTags() but we need String.Extras
		// return value.stripTags('span');
		
		value = value.replace('<span class="goocompleter_hightlight">', '');
		return value.replace('</span>', '');
	},
	
	/*	
	Function: setPosition
		Private method

		Set a relative position of a element in absolute values
	*/
	setRelPosition: function(field, container, x_offset, y_offset, overlap) {
		
		var field_position = field.getCoordinates();
		var top = field_position.top + y_offset;			
		
		top += !overlap ? field_position.height : 0;			
		
		container.setStyles({
			top: top,
			left: field_position.left + x_offset 
		});
						
	}
										
});

