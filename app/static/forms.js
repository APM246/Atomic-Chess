$(document).ready(
    /* eslint-disable-next-line prefer-arrow-callback */
    function initialise() {
        $("input[id='username']").on({
            focus() {
                if ($(this).val() === "Username") {
                    $(this).val("");
                }
            },
            blur() {
                if ($(this).val() === "" || $(this).val() === "Username") {
                    $(this).val("Username");
                }
            },
        });

        $("input[id='password']").on({
            focus() {
                if ($(this).val() === "Password") {
                    $(this).val("");
                }
            },
            blur() {
                if ($(this).val() === "" || $(this).val() === "Password") {
                    $(this).val("Password");
                }
            },
        });

        $(".ac-form-info").fadeIn("slow");
    },
);
