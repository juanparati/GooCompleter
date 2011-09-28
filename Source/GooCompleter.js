/*
---
script: goocompleter.js
license: GNU/GPL license.
description: Google style autocompleter for MooTools that use AJAX request.
copyright: Copyright (c) Juan Lago D.
authors: [Juan Lago <juanparati[at]gmail[dot]com>]

requires: 
  core:1.4.0: 
  - Element.Event
  - Element.Event.Delegation
  - Request.JSON
provides: [GooCompleter]
A method create autocomplete fields!
*/

// MooCompleter class  
var GooCompleter = new Class({
	
	Implements: [Options, Events],
	
	options: {
		action: 'webservice.php',
		param: 'search',
		method: 'post',
		minlen: 0,
		delay: 1000,
    
		use_typebox: true,
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
		onAfterComplete: function(){}                   
	},
	
	blocked: false,
	suggestions: new Array(),
	
	
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
								
				// Prevent IE 9 padding positioning bug
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
				
				this.field.set('value', target.get('html'));
				
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
								
				if (event.key == 'up' || event.key == 'down')
				{
					if (this.listbox.getStyle('display') != 'none')	
					{
						var selected = this.navigate(event.key);
						
						if (this.options.use_typebox)
							this.typebox.empty();
							
						this.field.set('value', selected.get('html'));
					}
				
					event.stop();
									
				}
			
				
			}.bind(this));
			
		}
		
		
		// Retrieve suggestions on keyup
		this.field.addEvent('keyup', function(event) {
			
			var value = this.field.get('value');
			
			// Ignore some key events
			if (event.key == 'up' || event.key == 'down' || event.key == 'left' || event.key == 'right' || event.key == 'tab')
				return false;			
						
						
			// Optimize response of typebox
			if (this.options.use_typebox && this.suggestions.length > 0)
			{					
				var cachevalue = this.searchCache(value);
					
				if (cachevalue == false)
					this.typebox.empty();																	
				else 					
					this.writeTypebox(cachevalue);														
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
			
				// Show new result list
				if (this.options.use_listbox)
				{				
					new Element('li', {
						html: value,
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
		
		var found = false;
		
		Object.each(this.suggestions, function(value) {
			
			if (!found && search.toLowerCase() == value.substr(0, search.length).toLowerCase())			
				found = value;
							
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
			
			console.log(selected.getPosition(this.listbox).y);
			
		}
		
		return selected;
				
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

