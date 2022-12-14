// import { ReactComponent as Date } from './icon/date.svg'
import { useState, useRef, useCallback, useEffect } from 'react'
import { chunk, isEmpty } from 'lodash'

import api from '@api'
import { RootState } from '@reducer/index'
import { useSelector } from 'react-redux'
import { transformModelOutputData } from '../../utils'
import { ImageSlider, UIDatasetVisual, FlvMp4 } from '@src/UIComponents'

import { DatePicker, Skeleton, Empty } from 'antd'

import './ForecastResult.module.less'
import moment from 'moment'

const { RangePicker } = DatePicker;
const RenderView = (props: any) => {
  const { data, scenes } = props
  const datainfo = transformModelOutputData({ data: data.result || [], modelType: scenes })

  if (isEmpty(datainfo)) {
    return null
  }
  const {

    dataSet,

  } = datainfo
  // 这里不能让react复用、我猜是离屏canvas导致的缓存问题~
  return (
    <UIDatasetVisual
      key={Math.random().toString(36).slice(2)}
      url={data.url}
      zoom={true}
      canvasData={dataSet || []}
      drawCanvasData={scenes === 'detection' || scenes === 'monocular_3d_detection'}
      hasHtmlTips={scenes === 'classify'}
    />
  )
}

const ForecastResult = (props:any): JSX.Element => {
  const { setFetchResult } = props
  const versionInfo = useSelector((state: RootState) => {
    return state.modelDetailSlice.versionInfo
  })

  const { model_type } = versionInfo
  const [fictitiousList, setFictitiousList] = useState<any[]>([])
  const [chunkList, setChunkList] = useState<Array<any>>([])
  const [total, settotal] = useState(0)

  const [fetching, setFetching] = useState(false)

  const params = useRef<any>({

    begin: undefined,
    end: undefined
  })
  const page = useRef(1)

  const fetchData = useCallback(
    async () => {
      try {
        setFetching(true)
        const res = await api.get(`/v3/models/${versionInfo.id}/versions/${versionInfo.iter.id}/inference`, { params: { ...params.current, page: page.current } })
        if (res.code === 0) {
          const list = res.data
          settotal(list.length)
          const _list = chunk(list, 10)
          setChunkList(_list)

          setFictitiousList(_list[page.current - 1])
          setFetching(false)
        } else {
          setFetching(false)
        }
      } catch (e) {
        setFetching(false)
      }
    }, [versionInfo]
  )

  useEffect(() => {
    // react源码还是骚气骚气的
    setFetchResult(() => fetchData)
  }, [setFetchResult, fetchData])

  useEffect(() => {
    fetchData()
    // const fn = () => {
    //   fetchData({ isInit: true })
    // }
    // window.addEventListener('resize', fn)
    // return () => {
    //   window.removeEventListener('resize', fn)
    // }
  }, [fetchData])

  const fetchList = () => {
    setFictitiousList(chunkList[page.current - 1])
  }

  const renderView = (data: any) => {
    if (!data) {
      return null
    }
    const { url } = data
    const isVideo = /\.mp4$/.test(url)

    const getView = () => {
      if (isVideo) {
        return <FlvMp4 src={(url as any)} />
      } else {
        return <RenderView data={data} scenes={model_type} />
      }
    }
    // 1-预测中 2-成功 3-失败
    const textArr:string[] = ['-', '预测中', '成功', '失败']
    const textClsArr: string[] = ['-', 'running', 'success', 'failed']
    return (
      <div className='ForecastResult_item_werap'>
        <div className='canvas_wrap'>
          {getView()}
        </div>
        <div className={`info_wrap ${textClsArr[data.status] || 'success'}`}>

          <p className='thres'>
            状态：{textArr[data.status] || '-'}
          </p>
          <p className='thres'>阈值 : {data.thres}</p>
          <p>创建时间 : {moment(data.created * 1000).format('YYYY/MM/DD hh:mm:ss')}</p>
        </div>
      </div>
    )
  }

  const renderDotView = (data: any, activeIndex:any, index:any) => {
    const active = activeIndex === index
    return (
      <div className='ForecastResult_renderDotView'>
        {
          active ? (
            <div className='ForecastResult_renderDotView_tips'>
              <div>阈值:{data.thres}</div>
              <div>预测时间:</div>
              <div>{moment(data.created * 1000).format('YYYY/MM/DD hh:mm:ss')}</div>
            </div>
          ) : null
        }

        <img className='img_dot_btn' src={data?.url} />
      </div>
    )
  }

  const silckView = () => {
    if (fetching) {
      return (
        <Skeleton active/>
      )
    }

    if (total === 0) {
      return (
        <div>
          <Empty description='暂无数据,请上传预测数据'/>
        </div>
      )
    }
    return (
      <ImageSlider needCache={true} page={page} fetchData={fetchList} total={total} dataList={fictitiousList} renderView={renderView} renderDotView={renderDotView} />
    )
  }

  const handleRangeChange = (
    dates: any
  ) => {
    console.log(dates, 'info')

    if (dates) {
      const [start, end] = dates
      const _start = (start as moment.Moment).valueOf() / 1000
      const _end = (end as moment.Moment).valueOf() / 1000
      console.log(_start.toFixed(0), _end)

      params.current = {
        begin: _start.toFixed(0),
        end: _end.toFixed(0),
      }
    } else {
      params.current = {
        begin: undefined,
        end: undefined,
      }
    }

    fetchData()
  }
  return (
    <div styleName='ForecastResult'>
      <div className='ForecastResult_header'>
        <RangePicker placement='bottomRight' onChange={handleRangeChange} allowClear />
      </div>
      <div className='ForecastResult_content'>
        {silckView()}
      </div>
    </div>
  )
}

export default ForecastResult
