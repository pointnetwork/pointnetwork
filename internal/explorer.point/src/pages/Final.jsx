import Container from 'react-bootstrap/Container'
import $ from 'jquery';
import Swal from 'sweetalert2';

export default function Final() {


    function register(identity) {
        Swal.fire({
            title: 'Are you sure you want to be known as '+identity+'?',
            showCancelButton: true,
            confirmButtonText: 'Sure!',
        }).then((result) => {
            if (result.isConfirmed) {
                const csrf_token = window.localStorage.getItem('csrf_token');
                $.ajax({
                    url: '/v1/api/identity/register',
                    type: 'POST',
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: `{"identity": "${identity}", "_csrf": "${csrf_token}"}`,
                    success: () => {
                        window.location = '/';
                    },
                    error: err => {
                        console.error(err);
                        Swal.fire({title: 'Something went wrong'});
                    }
                });
            }
        })
    }

    function green() {
        $('#handle').css('border-color', 'green');
        $('#result').css('color', 'green');
        $('#finalize').show();
    }
    function red() {
        $('#handle').css('border-color', 'red');
        $('#result').css('color', 'red');
        $('#finalize').hide();
    }

    function available(identity) {
        green();
        $('#result').text(identity + ' is available');
    }

    function not_available(identity) {
        red();
        $('#result').text(identity + ' is not available');
    }

    function no(why) {
        red(); $('#result').text(why);
        return false;
    }

    function validate_identity(identity) {
        if (identity === '') return no('empty identity');
        if (! /^[a-zA-Z0-9]+?$/.test(identity)) return no('special characters are not allowed');
        if (identity.length > 16) return no('handle is too long');
        return true;
    }

    $(function() {
        $('#handle').keyup(function(e, a) {
            const identity = $('#handle').val();
            if (!validate_identity(identity)) return;
            $.get(`/v1/api/identity/identityToOwner/${identity}`, function(data) {
                if (
                    !(data && data.data && data.data.owner)
                    || data.data.owner === "0x0000000000000000000000000000000000000000"
                ) {
                    available(identity);
                } else {
                    not_available(identity);
                }
            });
        });
    });

    return (
        <Container className="p-3">
            <br/>
            <h1>Final step</h1>
            <p>Introduce yourself to the world by registering an identity, which will be your public web3 handle:</p>

            <input type="text" name="handle" id="handle" />

            <div id="result"></div>
            <br/>

            <div id="finalize" style={{display: 'none'}} >
                <button className="btn btn-info" onClick={() => register($('#handle').val())}>Register</button>
            </div>

        </Container>
    )

}
