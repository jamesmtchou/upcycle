describe('moreless', function(){
	var list = '<ul id="moreless-min-items">' +
        '<li>'+
        	'One'+
        '</li>'+
        '<li class="odd">' +
          'Two'+
        '</li>'+
        '<li class="even">' +
          'Three'+
        '</li>'+
        '<li class="odd">' +
          'Four'+
        '</li>'+
    '</ul>';
    var paragraph = '<div id="moreless-min-height"><p>Kale chips hella salvia fashion axe. Food truck PBR&B Kickstarter hella. Forage shabby chic church-key pickled pour-over. Carles wolf gentrify, fingerstache kale chips small batch disrupt skateboard Helvetica Austin letterpress cray tattooed.</p></div>';
    var $list, $paragraph;
    before(function(){
    	$paragraph = $(paragraph).appendTo('#sandbox-inner').children('p').moreless({
        	'linkContainer': '#moreless-min-height'
        }).end();
        $list = $(list).appendTo('#sandbox-inner').moreless({
        	'minItems': 1
        });
    });

    after(function(){
      $list.remove();
      $paragraph.remove();
    });

	it('has no conflict', function(){
		chai.expect($.fn.moreless.noConflict).to.be.a('function');
	});
	it('hides more items', function(){
		
		expect($list.children('li:visible')).to.have.length(1);
		$list.remove();
		$list = $(list)
				.appendTo('#sandbox-inner')
				.moreless({'minItems': 'same-y'});

		expect($list.children('li:visible')).to.have.length(1);
		
	});
});