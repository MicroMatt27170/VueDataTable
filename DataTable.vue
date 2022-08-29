<template>
  <div class='row mb-3'>
    <div class='col-md-12'>
      <div class='card card-outline'>
        <div :class='cardBodyClassComputed'>
          <div class='mb-3 d-flex flex-row'>
            <label class='form-label mt-3 me-3'>Búsqueda</label>
            <input v-model.lazy='searchModel'
                   class='form-control'
                   type='search'
                   style='max-width: 600px;'>
          </div>
          <table :class='tableClass'>
            <thead>
            <tr>
              <th v-for='col in columns' :key=col.key>
                <span v-if='col.sortable' style='cursor: context-menu'
                      @click='orderColumn(col.key)'>
                  <i class='material-icons-outlined mdc-18'>
                    {{ orderByModel !== col.key ? '&#xe164;' : (orderDirModel === 'desc' ? '&#xe5db;' : '&#xe5d8;') }}
                  </i>
                  {{ col.label }}
                </span>
                <span v-else v-text='col.label'></span>
              </th>
            </tr>
            </thead>
            <tbody>
            <tr v-for='(data, data_index) in dataset' :key='data_index' :class="setRowClass(data)">
              <td v-for='(col, col_index) in columns' :key='col_index'>
                <slot :name="'column('+col.key+')'" :cell='data[col.key]' :row='data'>
                  <span v-if='col.asLocalTime'>{{ datetimeToLocalString(data[col.key]) }}</span>
                  <div v-else-if='col.asBadge' class='mx-auto text-center'>
                    <span class='badge badge-primary' v-text='data[col.key]'></span>
                  </div>
                  <span v-else>{{ data[col.key] }}</span>
                </slot>
              </td>
            </tr>
            </tbody>
          </table>

          <nav aria-label="Page navigation example">
            <ul class="pagination">
              <li v-for='(link, ind) in links'
                  :key='ind'
                  :class="['page-item', link.active ? 'active':'', link.url ? '':'disabled']">
                <button class="page-link"
                        @click='currentPage = getPageFromUrl(link.url)'
                        v-text='link.label'/>
              </li>
            </ul>
          </nav>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Toast } from '~/plugins/sweet-alert2'

export default {
  name: 'DataTable',
  props: {
    endpoint: {
      default: '',
      type: String
    },
    columns: {
      default: () => {
        return [ {key: 'uuid', label: 'UUID', sortable: true } ]
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
      default: () => { return {} },
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
      default: () => { return [] },
      type: Array
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
          url: null, label: '', active: false
        }
      ],
      model_search: '',
      model_order_by: 'created_at',
      model_order_dir: 'desc'
    }
  },
  computed: {
    searchModel: {
      get() {
        return this.search ?? this.model_search
      },
      set(s) {
        this.model_search = s
        this.$emit('update:search', s);
      }
    },
    limitModel: {
      get() { return this.limit },
      set(x) { this.$emit('update:limit', x) }
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
        'table-borderless',
        this.small ? 'table-sm': ''
      ]
    },
    cardBodyClassComputed() {
      return ['card-body'].concat(this.cardBodyClass)
    }
  },
  watch: {
    limit(val) {
      this.fetchDataTable()
    },
    model_search(val) {
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
    }
  },
  mounted() {
    this.fetchDataTable()
  },
  methods: {
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
    orderColumn(col){
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
      return parseInt(params.get('page') ?? 1)
    },
    async fetchDataTable() {
      const params = {
        page: this.currentPage,
        order_by: this.orderByModel,
        order_dir: this.orderDirModel,
        ...this.extraParams
      }

      if (this.searchModel) {
        params.search_query = this.searchModel
      }

      return await this.$axios({
        method: 'get',
        // baseURL: process.env.NUXT_ENV_SERVER_API_URL,
        url: this.endpoint,
        params
      })
        .then(response => response.data)
        .then(responseData => {
          this.dataset = responseData.data
          this.urls = {
            firstPage: responseData.first_page_url,
            lastPage: responseData.last_page_url,
            nextPage: responseData.next_page_url,
            prevPage: responseData.prev_page_url,
          }
          this.total = responseData.total
          // this.currentPage = responseData.current_page
          this.links = responseData.links
          this.fromPage = responseData.from
          this.lastPage = responseData.last_page

          if (this.onDatasetFetch != null) {
            this.onDatasetFetch(this.dataset)
          }
        })
        .catch(err => {
          this.errorStatus = !err.response ?  'Error: Network Error on DataTable Endpoint' : err.response.data.message;
          Toast.fire({
            icon: 'error',
            title: err?.response?.data?.message ?? err?.message ?? 'Unexpected error occurred.'
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
    }
  }
}
</script>

<style scoped>

</style>
