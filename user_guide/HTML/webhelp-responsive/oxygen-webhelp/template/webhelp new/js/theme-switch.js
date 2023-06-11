$( document ).ready(function() {
  
  $('input#wh-theme-switch-checkbox').change(function() {
    if ($(this).is(':checked')) {
      switchTheme(true);
    } else {
      switchTheme(false);
    }
  });
});

const switchTheme = (darkMode) => {
  if (darkMode) {
    $('html').attr('data-theme', 'dark');
  } else {
    $('html').removeAttr('data-theme');
  }
};
