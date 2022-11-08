export default function (query) {
    let params = new URLSearchParams()

    let setObjectParams = function (obj, parent = '') {
      let keys = Object.keys(obj)

      let propKey = (k) => parent === '' ? k : `[${k}]`

      keys.forEach(k => {

        if (Array.isArray(obj[k])) {
          obj[k].forEach(arr => {
            params.set(`${parent}${propKey(k)}[]`, arr)
          })
        } else if (typeof obj[k] === 'object') {
          setObjectParams(obj[k], `${parent}${propKey(k)}`)
        } else {
          params.set(`${parent}${propKey(k)}`, obj[k])
        }

      })
    }

    setObjectParams(query)

    return params;
}