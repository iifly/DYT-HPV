// 创建一个axios实例
const axios_instance = axios.create()

// 设置axios拦截器：请求拦截器
axios_instance.interceptors.request.use(req => {
    return req
}, err => {
    // 请求未成功发出，如：没有网络...
    return Promise.reject(err)
})

// 设置axios拦截器: 响应拦截器
axios_instance.interceptors.response.use(res => {
    // 成功响应的拦截
    if (1 === res.data.code) {
        // 处理成功
        return Promise.resolve(res.data.data)
    }
    // 处理异常
    console.error(res.data.msg)
    return Promise.reject(res.data.msg)
}, err => {
    // 失败响应的拦截
    console.error(); (err)
    // 注意这里应该return promise.reject(),
    // 因为如果直接return err则在调用此实例时，响应失败了也会进入then(res=>{})而不是reject或catch方法
    return Promise.reject(err)
})

// 判空
function isEmpty(obj) {
    if (!obj) return true; //检验 undefined 和 null           
    if (obj === "") return true; //检验空字符串
    if (obj === "null") return true; //检验字符串类型的null
    if (obj === "undefined") return true; //检验字符串类型的 undefined
    if (Array.prototype.isPrototypeOf(obj) && obj.length === 0) return true; //检验空数组
    if (Object.prototype.isPrototypeOf(obj) && Object.keys(obj).length === 0) return true;  //检验空对象
    return false;
}

function appendKey(hos_code, doc_id, dep_id) {
    return hos_code + "-" + doc_id + "-" + dep_id;
}

function saveCache(name, value) {
    sessionStorage.setItem(name, JSON.stringify(value))
}

function getCache(name) {
    return JSON.parse(sessionStorage.getItem(name));
}

function parseToken(token) {
    console.log("token sourse : ", token);
    var base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    var tokenParse = JSON.parse(window.atob(base64));
    console.log("token parse : ", tokenParse);
    return tokenParse;
}

// 九价医院列表
const hpv_hos_list_url = "https://dytapi.ynhdkc.com/Vaccine/hpvhoslist";

// 疫苗详情
const hpv_detail_url = "https://newdytapi.ynhdkc.com/index/doctor/";

// 医院排班情况
const query_schedule_url = "https://newdytapi.ynhdkc.com/index/schedule/";

//就诊人列表
const query_patient_url = "https://newdytapi.ynhdkc.com/index/patient/";

//预约疫苗
const appoint_url = "https://dytapi.ynhdkc.com/v1/appoint";


const DYT = {

    data() {
        return {
            tokenIn: "",
            token: "",
            tokenMsg: "",
            tokenParse: {},
            isSetToken: false,
            appointSuccess: false,
            userId: null,
            patientList: [],
            patient: {},
            hpvHosList: [],
            checkedHpvList: [],
            schedules: []
        }
    },
    created() {
        var _this = this
        var hpvHosList = getCache("hpvHosList")
        if (isEmpty(hpvHosList)) {
            _this.init();
        } else {
            _this.hpvHosList = hpvHosList;
        }
        console.log("init initHpvHos", _this.hpvHosList);
    },
    watch: {
        tokenIn(newVal, oldVal) {
            var _this = this
            var index = newVal.indexOf("=");
            if (-1 !== index) {
                newVal = newVal.slice(index + 1);
            }
            try {
                var tokenParse = parseToken(newVal)
                var userId = tokenParse.user_id;
                if (isEmpty(userId)) {
                    _this.tokenMsg = "token 解析失败！请重新输入...";
                    return;
                }
                _this.token = newVal;
                _this.tokenParse = tokenParse;
                _this.userId = userId;
                _this.isSetToken = true;
            } catch (error) {
                _this.tokenMsg = "token 解析失败或已过期！请重新输入...";
            }
        },
        patient(newVal, oldVal) {
            var _this = this;
            console.log("## patient ==>", _this.patient);
        }
    },
    methods: {
        // 查询就诊人
        queryPatient() {
            var _this = this;
            var base_url = query_patient_url + _this.userId;
            var access_token = "DYT " + _this.token;
            axios_instance.get(base_url, {
                headers: {
                    'Authorization': access_token
                }
            }).then(data => {
                _this.patientList = data;
                console.log("## patientList ==> ", _this.patientList);
            }).catch(err => {
                console.error(err)
            })
        },

        // 查询九价医院
        init() {
            var _this = this
            axios_instance.get(hpv_hos_list_url)
                .then(async data => {
                    _this.hpvHosList = data;
                    await _this.initHpvInfo();
                    saveCache("hpvHosList", _this.hpvHosList);
                })
                .catch(err => {
                    console.error(err)
                })
        },
        // 初始化/缓存疫苗详情
        async initHpvInfo() {
            var _this = this
            if (isEmpty(_this.hpvHosList)) {
                alert("请先选择医院！");
                return;
            }
            for (hosIndex in _this.hpvHosList) {
                var hos = _this.hpvHosList[hosIndex];
                for (doctorIndex in hos.doctor) {
                    var doctor = hos.doctor[doctorIndex];
                    var detail = await _this.queryHpvDetail(doctor.doc_id, doctor.dep_id, hos.hos_code);
                    console.log(doctor.doc_id, doctor.dep_id, hos.hos_code, " ==>", detail);
                    doctor["detail"] = detail;
                }
            }
        },
        // 查询疫苗详情
        async queryHpvDetail(doc_id, dep_id, hos_code) {
            var _this = this;
            var result;
            var base_url = hpv_detail_url + doc_id;
            console.log(base_url);
            await axios_instance.get(base_url, {
                params: {
                    "dep_id": dep_id,
                    "hos_code": hos_code
                }
            }).then(data => {
                console.log("## HpvDetail ==>", data);
                result = data;
            }).catch(err => {
                console.error(err)
            })

            return result;
        },

        refreshCache() {
            var _this = this;
            sessionStorage.clear();
            this.init();
            saveCache("hpvHosList", _this.hpvHosList);
        },


        // 查询排班
        async querySchedule() {
            var _this = this;
            var checkedHpvList = _this.checkedHpvList;
            if (isEmpty(checkedHpvList)) {
                alert("请先选择疫苗！");
                return;
            }
            var next = 0;
            _this.schedules = [];
            console.log("## checkedHpvList ==>", checkedHpvList);
            for (index in checkedHpvList) {
                var hpv = checkedHpvList[index];
                axios_instance.get(query_schedule_url, {
                    params: {
                        "dep_id": hpv.dep_id,
                        "doc_id": hpv.doc_id,
                        "hos_code": hpv.hos_id,
                    }
                }).then(data => {
                    console.log("## schedule ==>", data);
                    data.forEach(e => {
                        e["hpv"] = hpv;
                        _this.schedules[next++] = e;
                    });
                }).catch(err => {
                    console.error(err)
                })

            }
        },

        // 预约
        appoint(hpvDetail, schedule) {
            var _this = this;
            if (_this.appointSuccess) {
                alert("已有预约成功记录！");
                return;
            }
            var access_token = "DYT " + _this.token;
            axios_instance.post(appoint_url,
                {
                    "hos_name": hpvDetail.hos_name,
                    "hos_code": hpvDetail.hos_id,
                    "doc_name": hpvDetail.doc_name,
                    "doc_id": hpvDetail.doc_id,
                    "dep_name": hpvDetail.dep_name,
                    "dep_id": hpvDetail.dep_id,
                    "level_name": hpvDetail.level_name,

                    "pat_id": _this.patient.pat_id,

                    "schedule_id": schedule.schedule_id,
                    "sch_date": schedule.sch_date,
                    "cate_name": schedule.cate_name,
                    "time_type": schedule.time_type,
                    "ghf": schedule.ghf,
                    "zlf": schedule.zlf,
                    "zjf": schedule.zjf,

                    "jz_card": "",
                    "info": "",
                    "jz_start_time": 0,
                    "amt": 0.0,
                    "jz_card_type": 0,
                    "queue_sn_id": "",
                    "wechat_login": "dytminiapp",
                },
                {
                    headers: {
                        'Authorization': access_token
                    }
                }).then(data => {
                    console.log("## schedule ==>", data);
                    _this.appointSuccess = true;
                    alert("预约成功！" + hpvDetail.hos_name + "#" + schedule.sch_date + " " + schedule.cate_name);
                }).catch(err => {
                    console.error(err)
                })

        },
    }
}

Vue.createApp(DYT).mount('#dyt')
