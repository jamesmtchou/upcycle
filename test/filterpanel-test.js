describe('filterpanel', function(){
	var filterOptions = {
      'data': [{
        'name': 'Mike',
        'age': 10,
        'greeting': 'Hello'
      },{
        'name': 'Aaron',
        'age': 12,
        'greeting': 'Hi'
      },{
        'name': 'Eddie',
        'age': 14,
        'greeting': 'Hey'
      },{
      	'name': 'Mike',
      	'age': 20,
      	'greeting': 'Yo'
      }],
      'facets': [{
        'name': 'name',
        'displayName': 'Name'
      },{
      	'name': 'age',
      	'displayName': 'Age'
      }]
    };
  var filterpanel = $('<div/>').filterpanel(filterOptions).data('upcycle-filterpanel');
	
  it('adds facet options based on dataset', function(){
		var facets = filterpanel.option('facets');
		expect(facets).to.be.a('array');
		expect(facets).to.have.length(2);
		expect(facets[0].options).to.be.a('array');
		expect(facets[0].options).to.have.length(3);
		expect(facets[1].options).to.be.a('array');
		expect(facets[1].options).to.have.length(4);
	});
  it('does not attempt to determine facet options if data source not provided', function(){
    filterpanel.option({
      'data': null
    });
    var facets = filterpanel.option('facets');
    expect(facets).to.be.a('array');
    expect(facets).to.have.length(2);
    expect(facets[0].options).to.have.length(0);
  });
  it('includes selected facets with change events', function(done){
    filterpanel.option({
      'data': filterOptions
    });
    filterpanel.element.one('filterpanelchange', function(event, data){
      expect(data.selectedFacets[0].options).to.have.length(1);
      done();
    });
    var $checkboxes = filterpanel.element.find('[type="checkbox"]');
    $checkboxes[0].checked = true;
    $checkboxes.eq(0).trigger('change');
  });
  it('includes filtered dataset with change events', function(done){
    filterpanel.option('data', filterOptions.data);
    filterpanel.element.one('filterpanelchange', function(event, data){
      expect(data.filteredData).not.to.be.undefined;
      expect(data.filteredData).to.have.length(3);
      done();
    });
    var $checkboxes = filterpanel.element.find('[type="checkbox"]');
    $checkboxes[0].checked = true;
    $checkboxes[1].checked = true;
    $checkboxes.eq(0).trigger('change');
  });

  it('#set toggles checkboxes', function(done){
    filterpanel
      .clear()
      .option({'dataExtraction': null})
      .element.one('filterpanelchange', function(event, data){
        expect(data.selectedFacets[0].options).to.have.length(1);
        expect(data.selectedFacets[0].options[0]).to.equal('Mike');
        done();
      });
    // omitting arg after facets to select means, toggle those checkboxes
    filterpanel.set({
      'name': 'name',
      'options': ['Mike']
    });
  });
  
  it('#set sets textboxes explicitly', function(done){
    filterpanel
      .clear()
      .option({'dataExtraction': null})
      .element.one('filterpanelchange', function(event, data){
        expect(data.selectedFacets).to.have.length(0);
        done();
      });
    // passing false means deselect the checkbox
    filterpanel.set({
      'name': 'name',
      'options': ['Mike']
    }, {'toggle': false});
  });
  it('#set sets multiple textboxes explicitly', function(done){
    filterpanel
      .clear()
      .option({'dataExtraction': null})
      .element.one('filterpanelchange', function(event, data){
        expect(data.selectedFacets[0].options).to.be.length(2);
        expect(data.selectedFacets[0].options[1]).to.equal('Aaron');
        done();
      });
    // passing true means select the checkbox
    filterpanel.set({
      'name': 'name',
      'options': ['Mike', 'Aaron']
    }, {'toggle':true});
  });

  xit('provides dataExtraction option', function(done){
    filterpanel.clear();
    filterpanel.option({
      'dataExtraction': function(obj, key){
        return obj.attributes[key];
      },
      'data': [{
        'attributes': {
          'name': 'Mike'
        }
      },{
        'attributes': {
          'name': 'Aaron'
        }
      }]
    }).element.one('filterpanelchange', function(event, data){
      expect(data.selectedFacets[0].options).to.have.length(1);
      expect(data.filteredData).to.be.length(1);
      done();
    });
    filterpanel.set({
      'name': 'name',
      'options':['Mike']
    });
  });
});