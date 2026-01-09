// ===============================
// 初始化 ECharts
// ===============================
const chartDom = document.getElementById('org-chart');
const myChart = echarts.init(chartDom);

// ===============================
// 视图模式状态
// ===============================
let currentViewMode = 'org'; // 'org' 或 'staff'
let originalTreeData = null; // 保存原始数据
let staffViewData = null; // 员额视图数据

// ===============================
// 部门颜色映射（确保每个部门颜色不重复）
// ===============================
const departmentColors = {
  // 顶层
  '皇帝': '#FFD700',      // 金色
  
  // 三省
  '中书省': '#FF6B6B',     // 红色
  '门下省': '#4ECDC4',     // 青色
  '尚书省': '#45B7D1',     // 蓝色
  
  // 六部
  '吏部': '#96CEB4',       // 浅绿色
  '户部': '#FFB74D',       // 橙色
  '礼部': '#BA68C8',       // 紫色
  '兵部': '#64B5F6',       // 亮蓝色
  '刑部': '#FF8A65',       // 珊瑚红
  '工部': '#81C784',       // 草绿色
  
  // 其他可能出现的部门
  '内侍省': '#A1887F',     // 棕色
  '秘书省': '#90A4AE',     // 灰蓝色
  '殿中省': '#CE93D8',     // 浅紫色
  '御史台': '#FFAB91',     // 浅橙色
  '大理寺': '#80CBC4',     // 青绿色
  '国子监': '#9FA8DA',     // 淡紫色
  '太常寺': '#C5E1A5',     // 淡绿色
  '鸿胪寺': '#F48FB1',     // 粉红色
  
  // 默认/其他
  '其他': '#CCCCCC',
  'default': '#CCCCCC'
};

// 部门名称映射，处理可能的变体
const departmentAliases = {
  '中书': '中书省',
  '门下': '门下省',
  '尚书': '尚书省',
  '吏': '吏部',
  '户': '户部',
  '礼': '礼部',
  '兵': '兵部',
  '刑': '刑部',
  '工': '工部',
  '内侍': '内侍省',
  '秘书': '秘书省',
  '殿中': '殿中省',
  '御史': '御史台',
  '大理': '大理寺',
  '国子': '国子监',
  '太常': '太常寺',
  '鸿胪': '鸿胪寺'
};

// 部门节点关键字（用于识别部门节点）- 包括三省、六部和二十四司
const departmentKeywords = [
  // 三省
  '中书省', '门下省', '尚书省',
  // 六部
  '吏部', '户部', '礼部', '兵部', '刑部', '工部',
  // 其他部门
  '内侍省', '秘书省', '殿中省', '御史台', '大理寺', '国子监', '太常寺', '鸿胪寺',
  
  // 吏部四司
  '吏部司', '司封司', '司勋司', '考功司',
  
  // 户部四司
  '户部司', '度支司', '金部司', '仓部司',
  
  // 礼部四司
  '礼部司', '祠部司', '膳部司', '主客司',
  
  // 兵部四司
  '兵部司', '职方司', '驾部司', '库部司',
  
  // 刑部四司
  '刑部司', '都官司', '比部司', '司门司',
  
  // 工部四司
  '工部司', '屯田司', '虞部司', '水部司'
];

// 创建一个部门关键字的Set以便快速查找
const departmentKeywordSet = new Set(departmentKeywords);

// 职官节点关键字（用于识别职官节点）
const officialKeywords = [
  // 高级官职
  '尚书', '侍郎', '郎中', '员外郎', '主事',
  // 其他官职
  '令', '丞', '卿', '少卿', '大夫', '郎', '将军', '尉', '史', '掾',
  '令史', '书令史', '都事', '主簿', '录事', '参军', '参军事',
  '判官', '推官', '掌固', '亭长', '掌故', '使', '监', '提举',
  '提点', '知', '同知', '通判', '司业', '博士', '助教'
];

// 创建一个职官关键字的Set以便快速查找
const officialKeywordSet = new Set(officialKeywords);

// ===============================
// 加载 data.json
// ===============================
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    originalTreeData = data; // 保存原始数据
    preprocessTree(data);
    initChart(data);
    setupViewToggle(); // 设置视图切换监听
  })
  .catch(err => {
    console.error('加载 data.json 失败：', err);
  });

// ===============================
// 设置视图切换监听
// ===============================
function setupViewToggle() {
  const orgRadio = document.getElementById('view-org');
  const staffRadio = document.getElementById('view-staff');
  
  // 如果找不到滑块元素，说明HTML还没修改，直接返回
  if (!orgRadio || !staffRadio) {
    console.warn('视图切换滑块未找到，请确保HTML已更新');
    return;
  }
  
  orgRadio.addEventListener('change', () => {
    if (currentViewMode !== 'org') {
      currentViewMode = 'org';
      switchToOrgView();
    }
  });
  
  staffRadio.addEventListener('change', () => {
    if (currentViewMode !== 'staff') {
      currentViewMode = 'staff';
      switchToStaffView();
    }
  });
}

// ===============================
// 预处理：统一控制节点大小 & 颜色（不改 JSON）
// ===============================
function preprocessTree(node, depth = 0) {
  const levelConfig = [
    { size: 70, color: '#2c3e50' }, // 皇帝 / 顶层
    { size: 60, color: '#34495e' }, // 三省
    { size: 52, color: '#3b6ea5' }, // 六部
    { size: 44, color: '#4aa3df' }, // 下属机构
    { size: 36, color: '#7fb3d5' }  // 更深层
  ];

  const cfg = levelConfig[Math.min(depth, levelConfig.length - 1)];

  node.symbolSize = cfg.size;
  node.itemStyle = {
    color: cfg.color,
    borderColor: '#1f2d3d',
    borderWidth: 1
  };

  if (node.children && node.children.length) {
    node.children.forEach(child => preprocessTree(child, depth + 1));
  }
}

// ===============================
// 获取节点所属的部门
// ===============================
function getDepartmentForNode(node) {
  // 先检查节点名称是否直接匹配部门
  const nodeName = node.name;
  
  // 直接匹配
  for (const dept in departmentColors) {
    if (dept !== '其他' && dept !== 'default' && nodeName === dept) {
      return dept;
    }
  }
  
  // 检查是否包含部门名称
  for (const dept in departmentColors) {
    if (dept !== '其他' && dept !== 'default' && nodeName.includes(dept)) {
      return dept;
    }
  }
  
  // 通过别名匹配
  for (const alias in departmentAliases) {
    if (nodeName.includes(alias)) {
      return departmentAliases[alias];
    }
  }
  
  // 如果是皇帝节点
  if (nodeName === '皇帝') {
    return '皇帝';
  }
  
  // 递归检查父节点
  if (node.parentName) {
    for (const dept in departmentColors) {
      if (dept !== '其他' && dept !== 'default' && node.parentName.includes(dept)) {
        return dept;
      }
    }
  }
  
  // 检查值字段
  if (node.value) {
    for (const dept in departmentColors) {
      if (dept !== '其他' && dept !== 'default' && node.value.includes(dept)) {
        return dept;
      }
    }
  }
  
  return '其他';
}

// ===============================
// 判断节点类型：部门节点还是职官节点
// ===============================
function getNodeType(node) {
  const nodeName = node.name;
  
  // 先检查是否是明确的部门节点（完全等于部门关键字之一）
  if (departmentKeywordSet.has(nodeName)) {
    return 'department';
  }
  
  // 检查是否是职官节点（名称包含职官关键字）
  for (const keyword of officialKeywords) {
    // 如果节点名称包含职官关键字，且不是部门节点，则认为是职官节点
    if (nodeName.includes(keyword)) {
      return 'official';
    }
  }
  
  // 默认根据上下文判断
  if (node.children && node.children.length > 0) {
    // 有子节点的通常是部门节点
    return 'department';
  }
  
  // 有员额数据的可能是部门节点
  if (node.staffEstimate && parseInt(node.staffEstimate) > 0) {
    return 'department';
  }
  
  // 默认视为职官节点
  return 'official';
}

// ===============================
// 计算员额节点大小（线性缩放，不使用对数）
// ===============================
function calculateNodeSize(staffNum, maxStaff) {
  if (!staffNum || staffNum <= 0) {
    return 20; // 最小节点大小
  }
  
  const minSize = 20; // 最小节点大小
  const maxSize = 100; // 最大节点大小
  
  // 线性缩放：size = minSize + (staffNum / maxStaff) * (maxSize - minSize)
  let size = minSize;
  
  if (maxStaff > 0) {
    const ratio = staffNum / maxStaff;
    size = minSize + ratio * (maxSize - minSize);
  }
  
  return Math.max(minSize, Math.min(size, maxSize));
}

// ===============================
// 提取所有部门的员额统计数据
// ===============================
function extractDepartmentStats(treeData) {
  const stats = {};
  
  // 首先收集所有员额数据，找到最大员额
  let globalMaxStaff = 0;
  
  const traverseForMax = (node) => {
    const staffNum = parseInt(node.staffEstimate) || 0;
    globalMaxStaff = Math.max(globalMaxStaff, staffNum);
    
    if (node.children && node.children.length) {
      node.children.forEach(child => {
        child.parentName = node.name; // 保存父节点名称
        traverseForMax(child);
      });
    }
  };
  
  traverseForMax(treeData);
  
  // 然后为每个部门收集统计信息
  const traverseForStats = (node, parentDept = '其他') => {
    const dept = getDepartmentForNode(node);
    const staffNum = parseInt(node.staffEstimate) || 0;
    
    // 如果当前节点没有明确部门，继承父节点的部门
    const effectiveDept = (dept === '其他' && parentDept !== '其他') ? parentDept : dept;
    
    if (!stats[effectiveDept]) {
      stats[effectiveDept] = {
        name: effectiveDept,
        color: departmentColors[effectiveDept] || departmentColors.default,
        totalStaff: 0,
        nodeCount: 0,
        maxStaff: 0,
        minStaff: Infinity,
        maxGlobalStaff: globalMaxStaff
      };
    }
    
    stats[effectiveDept].totalStaff += staffNum;
    stats[effectiveDept].nodeCount++;
    stats[effectiveDept].maxStaff = Math.max(stats[effectiveDept].maxStaff, staffNum);
    stats[effectiveDept].minStaff = Math.min(stats[effectiveDept].minStaff, staffNum);
    
    // 保存部门信息到节点
    node.department = effectiveDept;
    node.staffNumber = staffNum;
    node.nodeSize = calculateNodeSize(staffNum, globalMaxStaff);
    
    // 判断节点类型
    node.nodeType = getNodeType(node);
    
    if (node.children && node.children.length) {
      node.children.forEach(child => {
        child.parentName = node.name; // 保存父节点名称
        traverseForStats(child, effectiveDept);
      });
    }
  };
  
  traverseForStats(treeData);
  
  // 处理最小值为Infinity的情况
  Object.values(stats).forEach(stat => {
    if (stat.minStaff === Infinity) {
      stat.minStaff = 0;
    }
  });
  
  return stats;
}

// ===============================
// 预处理员额视图数据
// ===============================
function preprocessTreeForStaffView(treeData) {
  // 提取部门统计信息
  const departmentStats = extractDepartmentStats(treeData);
  
  // 计算每个部门的平均员额
  Object.values(departmentStats).forEach(stat => {
    stat.averageStaff = stat.nodeCount > 0 ? Math.round(stat.totalStaff / stat.nodeCount) : 0;
  });
  
  // 预处理每个节点的可视化属性
  const processNode = (node) => {
    const dept = node.department || '其他';
    const staffNum = node.staffNumber || 0;
    const stat = departmentStats[dept];
    const nodeType = node.nodeType || 'official';
    
    // 设置节点大小（根据员额数量线性计算）
    node.symbolSize = node.nodeSize || 20;
    
    // 设置节点颜色（根据部门）
    const nodeColor = departmentColors[dept] || departmentColors.default;
    
    // 根据节点类型设置不同的边框样式
    let borderColor = '#FFFFFF'; // 默认白色边缘（职官节点）
    let borderWidth = 2;
    
    if (nodeType === 'department') {
      // 部门节点：黑色实线边缘（包括三省、六部和二十四司）
      borderColor = '#000000'; // 黑色边缘
      borderWidth = 2;
    } else {
      // 职官节点：白色边缘
      borderColor = '#FFFFFF'; // 白色边缘
      borderWidth = 2;
    }
    
    node.itemStyle = {
      color: nodeColor,
      borderColor: borderColor,
      borderWidth: borderWidth,
      shadowBlur: 5,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowOffsetY: 2
    };
    
    // 为标签选择对比色
    const textColor = getContrastColor(nodeColor);
    node.labelColor = textColor;
    
    // 保存节点类型信息用于工具提示
    node.nodeType = nodeType;
    node.departmentStat = stat;
    
    // 处理子节点
    if (node.children && node.children.length) {
      node.children.forEach(child => {
        child.parentName = node.name;
        processNode(child);
      });
    }
  };
  
  processNode(treeData);
  
  return {
    treeData,
    departmentStats
  };
}

// ===============================
// 获取对比色（确保文字可读）
// ===============================
function getContrastColor(hexColor) {
  // 移除#号
  const hex = hexColor.replace('#', '');
  
  // 转换为RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 计算亮度（YIQ公式）
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // 根据亮度返回黑色或白色
  return yiq >= 128 ? '#333333' : '#ffffff';
}

// ===============================
// 切换到组织架构视图
// ===============================
function switchToOrgView() {
  if (!originalTreeData) return;
  
  console.log('切换到组织架构视图');
  
  // 预处理树数据
  preprocessTree(originalTreeData);
  
  // 设置组织架构的图表配置
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: params => {
        const d = params.data;
        if (!d) return '';
        return `
          <div style="text-align: left;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${d.name}</div>
            ${d.value ? `<div><b>职能：</b>${d.value}</div>` : ''}
            ${d.staffEstimate ? `<div><b>人数：</b>${d.staffEstimate}</div>` : ''}
            ${d.description ? `<hr style="margin: 6px 0; border-color: #eee;"/><div>${d.description}</div>` : ''}
          </div>
        `;
      }
    },
    series: [
      {
        type: 'tree',
        data: [originalTreeData],
        orient: 'TB',                 // 纵向
        layout: 'orthogonal',         // 正交布局（最稳定）
        edgeShape: 'polyline',        // 直线
        edgeForkPosition: '50%',
        top: 30,
        left: '5%',
        right: '25%',                 // 给右侧信息面板留空间
        bottom: 30,
        nodeGap: 8,                   // 横向节点间距（压缩）
        levelGap: 50,                 // 纵向层级间距（稳定）
        roam: false,                  // 禁止缩放 & 拖拽
        expandAndCollapse: true,
        initialTreeDepth: 2,          // 默认展开到「三省 → 六部」
        symbol: 'rect',
        symbolSize: val => val,
        label: {
          position: 'inside',
          color: '#fff',
          fontSize: 12,
          lineHeight: 16,
          width: 90,
          overflow: 'truncate',
          align: 'center'
        },
        lineStyle: {
          color: '#aaa',
          width: 2,
          curveness: 0
        },
        emphasis: {
          focus: 'descendant'
        },
        animationDuration: 300,
        animationDurationUpdate: 300
      }
    ]
  };
  
  myChart.setOption(option, true); // true表示不合并配置，完全替换
  
  // 重新绑定事件
  bindChartEvents();
  
  // 重置图表容器高度
  chartDom.style.height = '600px';
  myChart.resize();
}

// ===============================
// 切换到员额可视化视图
// ===============================
function switchToStaffView() {
  if (!originalTreeData) return;
  
  console.log('切换到员额可视化视图');
  
  // 深拷贝原始数据，避免污染
  const treeDataCopy = JSON.parse(JSON.stringify(originalTreeData));
  
  // 预处理员额视图数据
  const processedData = preprocessTreeForStaffView(treeDataCopy);
  const staffTreeData = processedData.treeData;
  const departmentStats = processedData.departmentStats;
  
  // 将部门统计转换为数组
  const statsArray = Object.values(departmentStats);
  
  // 按员额总数排序
  statsArray.sort((a, b) => b.totalStaff - a.totalStaff);
  
  // 计算所有节点中的最大员额，用于显示缩放信息
  const globalMaxStaff = statsArray.reduce((max, stat) => Math.max(max, stat.maxStaff), 0);
  
  // 设置员额可视化的图表配置
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: params => {
        const d = params.data;
        if (!d) return '';
        const staffNum = d.staffNumber || 0;
        const dept = d.department || '其他';
        const deptColor = departmentColors[dept] || departmentColors.default;
        const stat = d.departmentStat;
        const nodeType = d.nodeType === 'department' ? '部门' : '职官';
        const borderColor = d.itemStyle?.borderColor || '#FFFFFF';
        const borderDesc = borderColor === '#000000' ? '黑色实线边缘' : '白色实线边缘';
        
        // 计算员额占比
        const staffRatio = globalMaxStaff > 0 ? (staffNum / globalMaxStaff * 100).toFixed(1) : 0;
        
        let deptInfo = '';
        if (stat) {
          deptInfo = `
            <div style="margin-top: 8px; padding: 6px; background: #f8f9fa; border-radius: 4px;">
              <div style="font-size: 12px; color: #666;">${dept}部门统计：</div>
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span>总员额: ${stat.totalStaff}</span>
                <span>平均: ${stat.averageStaff}</span>
                <span>最大: ${stat.maxStaff}</span>
              </div>
            </div>
          `;
        }
        
        return `
          <div style="text-align: left; min-width: 220px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${d.name}</div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <span style="display: inline-block; width: 12px; height: 12px; background: ${deptColor}; border: 1px solid ${borderColor}; margin-right: 6px; border-radius: 50%;"></span>
              <div>
                <div><b>类型：</b>${nodeType}节点 (${borderDesc})</div>
                <div><b>部门：</b>${dept}</div>
              </div>
            </div>
            <div style="margin-bottom: 6px;">
              <span><b>员额：</b>${staffNum}人</span>
              <span style="margin-left: 12px; color: #666;">占比: ${staffRatio}%</span>
            </div>
            <div style="margin-bottom: 6px;">
              <span>节点大小: ${Math.round(d.symbolSize)}px</span>
            </div>
            ${d.value ? `<div style="margin-bottom: 6px;"><b>职能：</b>${d.value}</div>` : ''}
            ${deptInfo}
            ${d.description ? `<hr style="margin: 8px 0; border-color: #eee;"/><div>${d.description}</div>` : ''}
          </div>
        `;
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 20,
      top: 50,
      bottom: 50,
      textStyle: {
        color: '#333',
        fontSize: 12
      },
      data: statsArray.map(stat => ({
        name: stat.name,
        itemStyle: {
          color: stat.color
        }
      })),
      formatter: function(name) {
        const stat = statsArray.find(item => item.name === name);
        if (!stat) return name;
        
        return `${stat.name}: ${stat.totalStaff}人`;
      },
      selectedMode: 'multiple',
      selected: statsArray.reduce((acc, dept) => {
        acc[dept.name] = true;
        return acc;
      }, {})
    },
    series: [
      {
        type: 'tree',
        data: [staffTreeData],
        orient: 'TB',                 // 纵向
        layout: 'orthogonal',         // 正交布局（最稳定）
        edgeShape: 'polyline',        // 直线
        edgeForkPosition: '50%',
        top: 30,
        left: '5%',
        right: '22%',                 // 给右侧图例留更多空间
        bottom: 30,
        nodeGap: 35,                  // 横向节点间距增加，为圆形节点留空间
        levelGap: 75,                 // 纵向层级间距增加
        roam: false,                  // 禁止缩放 & 拖拽
        expandAndCollapse: true,
        initialTreeDepth: 2,          // 默认展开到「三省 → 六部」
        symbol: 'circle',             // 使用圆形节点
        symbolSize: val => val,
        label: {
          position: 'inside',
          color: (params) => {
            return params.data.labelColor || '#333';
          },
          fontSize: 11,
          lineHeight: 14,
          width: 75,
          overflow: 'truncate',
          align: 'center',
          formatter: (params) => {
            // 显示节点名称和员额数量
            const name = params.data.name || '';
            const staffNum = params.data.staffNumber || 0;
            if (staffNum > 0) {
              // 简写名称，避免过长
              const shortName = name.length > 6 ? name.substring(0, 6) + '...' : name;
              return `${shortName}\n${staffNum}人`;
            }
            return name.length > 8 ? name.substring(0, 8) + '...' : name;
          }
        },
        lineStyle: {
          color: '#e0e0e0',
          width: 1.5,
          curveness: 0
        },
        emphasis: {
          focus: 'descendant',
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            borderWidth: 3,
            borderColor: '#ff5722'
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: [2, 4],
            borderRadius: 4
          }
        },
        animationDuration: 300,
        animationDurationUpdate: 300
      }
    ]
  };
  
  myChart.setOption(option, true);
  
  // 绑定事件
  bindChartEvents();
  
  // 调整图表容器高度
  chartDom.style.height = '600px';
  myChart.resize();
}

// ===============================
// 绑定组织架构图表事件
// ===============================
function bindChartEvents() {
  // 先移除所有事件监听器
  myChart.off('click');
  myChart.off('treeexpand');
  myChart.off('treecollapse');
  
  // 点击节点 → 右侧信息面板
  myChart.on('click', params => {
    if (params.data) {
      updateInfoPanel(params.data);
    }
  });
  
  // 展开 / 折叠时 → 自动增高容器
  myChart.on('treeexpand', autoResizeHeight);
  myChart.on('treecollapse', autoResizeHeight);
}

// ===============================
// 初始化树状图
// ===============================
function initChart(treeData) {
  // 设置默认视图（组织架构）
  switchToOrgView();
}

// ===============================
// 根据展开深度动态增加高度 → 用浏览器滚动条
// ===============================
function autoResizeHeight() {
  const baseHeight = 600;
  const extra = 300;

  const option = myChart.getOption();
  const depth = getMaxDepth(option.series[0].data[0]);

  const newHeight = baseHeight + Math.max(0, depth - 3) * extra;
  chartDom.style.height = newHeight + 'px';

  myChart.resize();
}

// ===============================
// 计算当前展开最大深度
// ===============================
function getMaxDepth(node, depth = 1) {
  if (!node.children || !node.children.length) return depth;

  let max = depth;
  node.children.forEach(c => {
    max = Math.max(max, getMaxDepth(c, depth + 1));
  });
  return max;
}

// ===============================
// 更新右侧信息面板
// ===============================
function updateInfoPanel(node) {
  const panel = document.querySelector('.selected-info');
  if (!panel) return;

  let html = `<h3>${node.name}</h3>`;

  // 在员额视图下，显示更多信息
  if (currentViewMode === 'staff') {
    const dept = node.department || '其他';
    const deptColor = departmentColors[dept] || departmentColors.default;
    const nodeType = node.nodeType === 'department' ? '部门节点' : '职官节点';
    const borderColor = node.itemStyle?.borderColor || '#FFFFFF';
    const borderDesc = borderColor === '#000000' ? '黑色实线边缘' : '白色实线边缘';
    
    html += `<p><b>类型：</b>${nodeType} (${borderDesc})</p>`;
    html += `<p><b>部门：</b> <span style="display: inline-block; width: 12px; height: 12px; background: ${deptColor}; border: 1px solid ${borderColor}; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>${dept}</p>`;
  }

  if (node.value) html += `<p><b>职能：</b>${node.value}</p>`;
  
  if (node.staffEstimate || node.staffNumber) {
    const staffNum = node.staffNumber || parseInt(node.staffEstimate) || 0;
    html += `<p><b>员额：</b>${staffNum}人`;
    
    // 在员额视图下，添加节点大小信息
    if (currentViewMode === 'staff' && node.symbolSize) {
      html += ` <span style="color:#666;font-size:12px;">(节点大小: ${Math.round(node.symbolSize)}px)</span>`;
      
      // 显示部门统计信息
      if (node.departmentStat) {
        const stat = node.departmentStat;
        html += `<div style="margin-top: 10px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">${node.department}部门统计</div>
                  <div>总员额: ${stat.totalStaff}人</div>
                  <div>平均员额: ${stat.averageStaff}人</div>
                  <div>节点数量: ${stat.nodeCount}个</div>
                </div>`;
      }
    }
    html += `</p>`;
  }
  
  if (node.quota) html += `<p><b>编制：</b>${node.quota}</p>`;
  if (node.description) html += `<p><b>说明：</b>${node.description}</p>`;

  if (node.historicalFigures?.length) {
    html += `<p><b>历史人物：</b></p><ul>`;
    node.historicalFigures.forEach(f => {
      html += `<li>${f.name}（${f.era}）</li>`;
    });
    html += `</ul>`;
  }

  panel.innerHTML = html;
}

// ===============================
// 窗口大小变化时重绘图表
// ===============================
window.addEventListener('resize', () => {
  myChart.resize();
});