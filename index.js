import Swal from 'sweetalert2'

export async function HandleElementDelete({endpoint, title = 'Eliminar elemento', text = '¿Seguro que desea eliminar el elemento?', confirmBtnText = 'Eliminar', cancelBtnText = 'Cancelar'}) {
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: confirmBtnText,
      cancelButtonText: cancelBtnText,
      customClass: {
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-link'
      }
    })

    if (result.isDismissed || result.isDenied || !result.isConfirmed) {
      return false;
    }

    try {
      const response = await this.$axios({
        method: 'delete',
        baseURL: process.env.NUXT_ENV_SERVER_API_URL,
        url: endpoint
      })

      await Toast.fire({
        icon: 'success',
        title: response.data.message
      })

      return true;

    } catch (err) {
      await Toast.fire({
        icon: 'error',
        title:
          err?.response?.data?.message ??
          err?.message ??
          'Unexpected error occurred.'
      })

      return false;
    }
  }