$('.user-btn').click(function() {
  var replace = $('.user-input').val();
  $('.hdr').text(replace);
});




$('input').on('input', function() {
  var v = $(this).val();
  $('.hdr').css('font-size', v + 'em')
});

$('.user-slider').on('input', function() {
  var v = $(this).val();
  $('#demo').text(v);
});