$(document).ready( 
    function initialise() {
        $("input[id='username']").on({
            focus: function() {
                if ($(this).val() == 'Username') 
                {
                    $(this).val('');
                }
            },

            blur: function() {
                if ($(this).val() == '' || $(this).val() == 'Username') 
                {
                    $(this).val('Username');
                }
            }
        });

        $("input[id='password']").on({ 
            focus: function() {
                if ($(this).val() == 'Password') 
                {
                    $(this).val('');
                }
            },

            blur: function() {
                if ($(this).val() == '' || $(this).val() == 'Password') 
                {
                    $(this).val('Password');
                }
            }
        });
        
        $(".ac-form-info").fadeIn("slow");
        console.log("hi");
    }
);