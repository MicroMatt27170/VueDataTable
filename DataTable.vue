<template>
  <div>
    <div>
      <!-- SEARCH INPUT -->
      <div class='mb-3'>
        <slot name='search'>
          <div class='datatable-search'>
            <div class='input-group'>
              <span class='input-group-text'>
                <i class='material-icons'>&#xe8b6;</i>
              </span>
              <div class='form-floating'>
                <input
                  id='input-search'
                  v-model='searchModel'
                  class='form-control'
                  placeholder='Búsqueda'
                  type='search'
                />
                <label
                  aria-hidden='true'
                  class='form-label mb-0 pb-0'
                  for='input-search'>
                  Búsqueda
                </label>
              </div>
            </div>
            <div>
              <button
                :title="
                  isColumnHidden
                    ? 'Mostrar columnas extras'
                    : 'Esconder columnas extras'
                "
                class='btn btn-link h-100 m-0'
                @click='toggleHiddenColumns'>
                <i class='material-icons icon-rotate'>
                  {{ isColumnHidden ? '&#xe94f;' : '&#xf1cf;' }}
                </i>
              </button>
            </div>
          </div>
        </slot>
      </div>

      <!-- TABLE -->
      <div :class='cardBodyClassComputed'>
        <table :class='tableClass'>
          <thead>
          <tr>
            <th
              v-for='col in columns.filter((c) => c.hide !== false)'
              :key='col.key'>
              <span
                v-if='col.sortable'
                class='cursor-pointer'
                @click='orderColumn(col.key)'>
                <i class='material-icons mdc-18'>
                  {{
                    orderByModel !== col.key
                      ? '&#xe164;'
                      : orderDirModel === 'desc'
                        ? '&#xe5db;'
                        : '&#xe5d8;'
                  }}
                </i>
                {{ col.label }}
              </span>
              <span
                v-else-if='col.isHideable'
                :class="isColumnHidden ? 'd-none' : ''">
                {{ col.label }}
            </span>
              <span v-else v-text='col.label'></span>
            </th>
          </tr>
          </thead>
          <tbody>
          <!-- LOADING STATE -->
          <tr v-if='isLoading'
              class='text-center'>
            <td :colspan='columns.length'>
              <div class='my-3'>
                <i class='material-icons mdc-38 animate spinIn my-2'>&#xe863;</i>
                <p class='subtitle-1 font-inter mdc-18 fw-bold mb-1'>
                  Buscando resultados....
                </p>
              </div>
            </td>
          </tr>

          <!-- SEARCH RESULTS STATE -->
          <tr
            v-for='(data, data_index) in dataset'
            :key='data_index'
            :class='setRowClass(data)'>
            <td v-for='(col, col_index) in columns'
                :key='col_index'>
              <slot
                :cell='data[col.key]'
                :name="'column(' + col.key + ')'"
                :row='data'>
              <span v-if='col.asLocalTime'>
                {{ datetimeToLocalString(data[col.key]) }}
              </span>
                <div v-else-if='col.asBadge' class='mx-auto text-center'>
                <span
                  class='badge badge-primary'
                  v-text='data[col.key]'>
                </span>
                </div>
                <div
                  v-else-if='col.isHideable'
                  :class="isColumnHidden ? 'd-none' : ''">
                  {{ data[col.key] }}
                </div>
                <span v-else>{{ data[col.key] }}</span>
              </slot>
            </td>
          </tr>

          <!-- EMPTY STATE -->
          <tr v-if='!isLoading && (!dataset || (dataset && dataset.length < 1))'
              class='text-center'>
            <td :colspan='columns.length'>
              <div class='my-3'>
                <i class='material-icons mdc-38 my-2'>&#xea76;</i>
                <p class='subtitle-1 font-inter mdc-18 fw-bold mb-1'>
                  No hay resultados encontrados
                </p>
                <p class='subtitle-2 font-inter text-muted mb-2'>
                  Intenta con otro nombre, descripción o criterio de búsqueda
                </p>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINATION -->
      <nav aria-label='Datatable pagination'>
        <ul class='pagination'>
          <li
            v-for='(link, ind) in links'
            :key='ind'
            :class="[
              'page-item',
              link.active ? 'active' : '',
              link.url ? '' : 'disabled',
            ]">
            <button
              class='page-link'
              @click='currentPage = getPageFromUrl(link.url)'
              v-text='link.label'/>
          </li>
        </ul>
        <p class='subtitle-2 text-muted mt-1 mb-0'>
          Página {{ currentPage }} de {{ lastPage }} con {{ total }} registros
        </p>
      </nav>

    </div>
  </div>
</template>

<script>
import { Toast } from '~/plugins/sweet-alert2'
import objectToQueryParams from './objectToQueryParams'

export default {
  name: 'DataTable',
  props: {
    endpoint: {
      default: '',
      type: String
    },
    columns: {
      default: () => {
        return [{ key: 'uuid', label: 'UUID', sortable: true }]
      },
      type: Array
    },
    limit: {
      default: 15,
      type: Number
    },
    orderBy: {
      default: null,
      type: String
    },
    orderDir: {
      default: null,
      type: String
    },
    search: {
      default: null,
      type: String
    },
    extraParams: {
      default: () => {
        return {}
      },
      type: Object
    },
    onDatasetFetch: {
      default: null,
      type: Function
    },
    small: {
      default: false,
      type: Boolean
    },
    onRowClass: {
      default: null,
      type: Function
    },
    cardBodyClass: {
      default: () => {
        return []
      },
      type: Array
    },
    searchTimeoutOffset: {
      default: 1250,
      type: Number
    }
  },
  data() {
    return {
      dataset: [],
      urls: {
        firstPage: null,
        lastPage: null,
        nextPage: null,
        prevPage: null
      },
      total: 0,
      currentPage: 1,
      fromPage: 1,
      lastPage: 1,
      links: [
        {
          url: null,
          label: '',
          active: false
        }
      ],
      search_timeout: null,
      model_search: this.search ?? '',
      model_order_by: 'created_at',
      model_order_dir: 'desc',
      isColumnHidden: true,
      isLoading: false
    }
  },
  computed: {
    searchModel: {
      get() {
        return this.search ?? this.model_search
      },
      set(s) {
        clearTimeout(this.search_timeout)
        this.search_timeout = setTimeout(() => {
          this.model_search = s
          this.$emit('update:search', s)
        }, this.searchTimeoutOffset)
      }
    },
    limitModel: {
      get() {
        return this.limit
      },
      set(x) {
        this.$emit('update:limit', x)
      }
    },
    orderByModel: {
      get() {
        return this.orderBy ?? this.model_order_by
      },
      set(x) {
        this.model_order_by = x
        this.$emit('update:orderBy', x)
      }
    },
    orderDirModel: {
      get() {
        return this.orderDir ?? this.model_order_dir
      },
      set(x) {
        this.model_order_dir = x
        this.$emit('update:orderDir', x)
      }
    },
    tableClass() {
      return [
        'table',
        'table-hover',
        'table-datatable',
        this.small ? 'table-sm' : ''
      ]
    },
    cardBodyClassComputed() {
      return ['table-responsive'].concat(this.cardBodyClass)
    }
  },
  watch: {
    limit(val) {
      this.fetchDataTable()
    },
    model_search(val) {
      this.currentPage = 1
      this.fetchDataTable()
    },
    model_order_by(val) {
      this.fetchDataTable()
    },
    model_order_dir(val) {
      this.fetchDataTable()
    },
    currentPage(val) {
      this.fetchDataTable()
    },
    extraParams(val) {
      this.fetchDataTable()
    }
  },
  mounted() {
    this.fetchDataTable()
  },
  methods: {
    objectToQueryParams(query) {
      const params = new URLSearchParams()

      const setObjectParams = function(obj, parent = '') {
        const keys = Object.keys(obj)

        const propKey = (k) => (parent === '' ? k : `[${k}]`)

        keys.forEach((k) => {
          if (Array.isArray(obj[k])) {
            obj[k].forEach((arr) => {
              params.set(`${parent}${propKey(k)}[]`, arr)
            })
          } else if (typeof obj[k] === 'object') {
            setObjectParams(obj[k], `${parent}${propKey(k)}`)
          } else if (obj[k] != null) {
            params.set(`${parent}${propKey(k)}`, obj[k])
          }
        })
      }

      setObjectParams(query)

      return params
    },
    setRowClass(row) {
      if (this.onRowClass === null) return ''
      else return this.onRowClass(row)
    },
    changeData(keyCol, keyValue, col, value) {
      this.dataset.forEach((row, ind) => {
        if (row[keyCol] === keyValue) {
          this.dataset[ind][col] = value
        }
      })
    },
    orderColumn(col) {
      if (this.orderByModel === col) {
        this.orderDirModel = this.orderDirModel === 'desc' ? 'asc' : 'desc'
      } else {
        this.orderByModel = col
      }
    },
    getPageFromUrl(url) {
      const baseUrl = this.endpoint
      const search = url.split(baseUrl)

      const params = new URLSearchParams(search[1])
      if (params.get('page') == null) {
        const page = url.split('page=')
        if (page.length > 0) {
          return parseInt(page[page.length - 1] ?? 1)
        }
      }
      return parseInt(params.get('page') ?? 1)
    },
    async fetchDataTable() {
      // Start loading state
      this.isLoading = true
      const params = {
        page: this.currentPage,
        order_by: this.orderByModel,
        order_dir: this.orderDirModel,
        ...this.extraParams
      }

      if (this.searchModel) {
        params.search_query = this.searchModel
      }

      this.columns.forEach((c) => {
        if (c.where) {
          if (params.where === undefined) params.where = {}

          if (c.where === '*') params.where[c.key] = this.searchModel
          else if (c.where === '%*')
            params.where[c.key] = '%' + this.searchModel
          else if (c.where === '%*%')
            params.where[c.key] = '%' + this.searchModel + '%'
          else if (c.where.value === '*')
            params.where[c.key] = Object.assign({}, params.where, {
              value: this.searchModel
            })
          else if (c.where.value === '%*')
            params.where[c.key] = Object.assign({}, params.where, {
              value: '%' + this.searchModel
            })
          else if (c.where.value === '%*%')
            params.where[c.key] = Object.assign({}, params.where, {
              value: '%' + this.searchModel + '%'
            })
        }
      })

      const urlParams = this.objectToQueryParams(params)

      return await this.$axios({
        method: 'get',
        // baseURL: process.env.NUXT_ENV_SERVER_API_URL,
        url: this.endpoint,
        params: urlParams
      })
        .then((response) => response.data)
        .then((responseData) => {
          this.dataset = responseData.data
          this.urls = {
            firstPage: responseData.first_page_url,
            lastPage: responseData.last_page_url,
            nextPage: responseData.next_page_url,
            prevPage: responseData.prev_page_url
          }
          this.total = responseData.total
          // this.currentPage = responseData.current_page
          this.links = responseData.links
          this.fromPage = responseData.from
          this.lastPage = responseData.last_page
          // End loading state
          this.isLoading = false

          if (this.onDatasetFetch != null) {
            this.onDatasetFetch(this.dataset)
          }
        })
        .catch((err) => {
          // End loading state
          this.isLoading = false
          this.errorStatus = !err.response
            ? 'Error: Network Error on DataTable Endpoint'
            : err.response.data.message
          Toast.fire({
            icon: 'error',
            title:
              err?.response?.data?.message ??
              err?.message ??
              'Unexpected error occurred.'
          })
        })
    },
    datetimeToLocalString(datetime) {
      try {
        const d = new Date(datetime)
        return d.toLocaleString()
      } catch (e) {
        return null
      }
    },
    toggleHiddenColumns() {
      this.isColumnHidden = !this.isColumnHidden
    }
  }
}
</script>
