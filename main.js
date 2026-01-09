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
let preprocessedOrgData = null; // 组织架构视图预处理数据
let preprocessedStaffData = null; // 员额视图预处理数据

// ===============================
// 缩放状态
// ===============================
let currentZoom = 1.0; // 当前缩放比例
const MIN_ZOOM = 0.5; // 最小缩放比例
const MAX_ZOOM = 2.0; // 最大缩放比例
const ZOOM_STEP = 0.1; // 缩放步长

// ===============================
// 搜索相关状态
// ===============================
let searchTerm = ''; // 当前搜索词
let highlightedNodes = []; // 高亮的节点（用于重置）
let currentDepth = 3; // 当前展开深度

// ===============================
// 展开/折叠状态
// ===============================
let isAllExpanded = false; // 是否全部展开
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

// ✅ 新增：三省六部下节点颜色集合（确保不重复）
const subNodeColors = {
  // 中书省子节点颜色集合
  '中书省': ['#FF8A8A', '#FF9E9E', '#FFB3B3', '#FFC7C7', '#FFDCDC'],
  // 门下省子节点颜色集合
  '门下省': ['#6FD8D0', '#84E0D9', '#99E9E2', '#ADF1EB', '#C2F9F4'],
  // 尚书省子节点颜色集合
  '尚书省': ['#66C6E0', '#7BCFE5', '#90D8EA', '#A5E1EF', '#BAEAF4'],
  // 吏部子节点颜色集合
  '吏部': ['#A8DBC3', '#B8E2CF', '#C8E9DB', '#D8F0E7', '#E8F7F3'],
  // 户部子节点颜色集合
  '户部': ['#FFC97D', '#FFD394', '#FFDDAA', '#FFE7C1', '#FFF1D8'],
  // 礼部子节点颜色集合
  '礼部': ['#D38FE0', '#DAA1E6', '#E1B4EC', '#E8C6F2', '#EFD9F8'],
  // 兵部子节点颜色集合
  '兵部': ['#8AC7F8', '#9AD0F9', '#AAD9FA', '#BAE2FB', '#CAEBFC'],
  // 刑部子节点颜色集合
  '刑部': ['#FFA48B', '#FFB39C', '#FFC2AD', '#FFD1BE', '#FFE0CF'],
  // 工部子节点颜色集合
  '工部': ['#9AD6A0', '#AADDAD', '#BAE4BA', '#CAEBC7', '#DAF2D4'],
  // 其他部门默认颜色集合
  '其他': ['#D1D1D1', '#D9D9D9', '#E0E0E0', '#E8E8E8', '#F0F0F0']
};

// ✅ 新增：用于跟踪每个部门已使用的颜色索引
const departmentColorIndex = {};

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
    initChart(data);
    setupViewToggle(); // 设置视图切换监听
    setupZoomControls(); // 设置缩放控制监听
    setupExpandControls(); // 设置展开/折叠控制监听
    setupSearchControls(); // 设置搜索控制监听
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
      currentDepth = isAllExpanded ? 100 : 3;
      switchToOrgView();
      clearSearchHighlights();
    }
  });
  
  staffRadio.addEventListener('change', () => {
    if (currentViewMode !== 'staff') {
      currentViewMode = 'staff';
      currentDepth = isAllExpanded ? 100 : 3;
      switchToStaffView();
      clearSearchHighlights();
    }
  });
}

// ===============================
// 设置缩放控制监听
// ===============================
function setupZoomControls() {
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomSlider = document.getElementById('zoom-slider');
  const zoomResetBtn = document.getElementById('zoom-reset');
  const zoomPercent = document.getElementById('zoom-percent');
  
  if (!zoomOutBtn || !zoomInBtn || !zoomSlider || !zoomResetBtn || !zoomPercent) {
    console.warn('缩放控件未找到，请确保HTML已更新');
    return;
  }
  
  // 缩小按钮
  zoomOutBtn.addEventListener('click', () => {
    setZoom(currentZoom - ZOOM_STEP);
  });
  
  // 放大按钮
  zoomInBtn.addEventListener('click', () => {
    setZoom(currentZoom + ZOOM_STEP);
  });
  
  // 滑块控制
  zoomSlider.addEventListener('input', (e) => {
    const zoomValue = parseInt(e.target.value) / 100;
    setZoom(zoomValue);
  });
  
  // 重置按钮
  zoomResetBtn.addEventListener('click', () => {
    setZoom(1.0);
  });
  
  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl + 加号 或 Ctrl + 滚轮向上
    if ((e.ctrlKey && (e.key === '+' || e.key === '=')) || 
        (e.ctrlKey && e.deltaY < 0)) {
      e.preventDefault();
      setZoom(currentZoom + ZOOM_STEP);
    }
    
    // Ctrl + 减号 或 Ctrl + 滚轮向下
    if ((e.ctrlKey && e.key === '-') || 
        (e.ctrlKey && e.deltaY > 0)) {
      e.preventDefault();
      setZoom(currentZoom - ZOOM_STEP);
    }
    
    // Ctrl + 0 重置
    if (e.ctrlKey && e.key === '0') {
      e.preventDefault();
      setZoom(1.0);
    }
  });

  // 添加滚轮缩放支持
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    chartContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoom(currentZoom + delta);
      }
    });
  }
}

// ===============================
// 设置搜索控制监听
// ===============================
function setupSearchControls() {
  console.log('Setting up search controls');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  
  if (!searchInput || !searchClear) {
    console.warn('搜索控件未找到，请确保HTML已更新');
    return;
  }
  
  console.log('Search input found:', searchInput);
  
  // 输入时实时搜索
  searchInput.addEventListener('input', (e) => {
    console.log('Search input event triggered, value:', e.target.value);
    searchTerm = e.target.value.trim().toLowerCase();
    performSearch();
  });
  
  // 清除搜索
  searchClear.addEventListener('click', () => {
    console.log('Clear search triggered');
    searchInput.value = '';
    searchTerm = '';
    clearSearchHighlights();
  });
}
function setupExpandControls() {
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');
  
  if (!expandAllBtn || !collapseAllBtn) {
    console.warn('展开/折叠控件未找到，请确保HTML已更新');
    return;
  }
  
  // 展开全部按钮
  expandAllBtn.addEventListener('click', () => {
    expandAllNodes();
  });
  
  // 折叠全部按钮
  collapseAllBtn.addEventListener('click', () => {
    collapseAllNodes();
  });
}

// ===============================
// 展开全部节点
// ===============================
function expandAllNodes() {
  if (!originalTreeData) return;
  
  console.log('展开全部节点');
  isAllExpanded = true;
  currentDepth = 100;
  
  // 获取当前option
  const option = myChart.getOption();
  
  if (option.series && option.series[0]) {
    // 根据当前视图模式恢复完整预处理数据
    if (currentViewMode === 'org') {
      option.series[0].data = [preprocessedOrgData];
    } else {
      option.series[0].data = [preprocessedStaffData];
    }
    
    option.series[0].initialTreeDepth = 100;
    option.series[0].lineStyle = { color: '#aaa', width: 1.2, curveness: 0 }; // 恢复连接线样式
    
    // 重新设置图表选项
    myChart.setOption(option, true);
    
    // 调整容器尺寸
    setTimeout(() => {
      adjustChartContainer();
      
      // 更新按钮状态
      updateExpandButtonState();
    }, 300);
  }
}

// ===============================
// 执行搜索
// ===============================
function performSearch() {
  console.log('Performing search for:', searchTerm);
  if (!searchTerm) {
    clearSearchHighlights();
    return;
  }
  
  clearSearchHighlights(); // 先清除旧的高亮
  
  const data = currentViewMode === 'org' ? preprocessedOrgData : preprocessedStaffData;
  highlightedNodes = findMatchingNodes(data);
  console.log('Found matches:', highlightedNodes.length);
  
  if (highlightedNodes.length > 0) {
    // 先展开树以显示所有节点
    currentDepth = 100;
    const option = myChart.getOption();
    option.series[0].initialTreeDepth = currentDepth;
    myChart.setOption(option, true);
    
    // 然后高亮匹配节点
    highlightedNodes.forEach(node => {
      console.log('Highlighting node:', node.name);
      node.itemStyle = { ...node.itemStyle, borderColor: '#FFD700', borderWidth: 5 };
    });
    
    // 重新设置数据
    option.series[0].data = [data];
    myChart.setOption(option, true);
    
    // 延迟聚焦，确保树已展开
    setTimeout(() => {
      // 聚焦到第一个匹配节点
      const firstMatch = highlightedNodes[0];
      const dataIndex = getNodeDataIndex(data, firstMatch);
      console.log('Focusing on node:', firstMatch.name, 'dataIndex:', dataIndex);
      if (dataIndex !== -1) {
        myChart.dispatchAction({
          type: 'treeFocus',
          seriesIndex: 0,
          dataIndex: dataIndex
        });
      }
    }, 500);
  }
}

// ===============================
// 查找匹配的节点
// ===============================
function findMatchingNodes(node) {
  const matches = [];
  
  function traverse(currentNode) {
    console.log('Checking node:', currentNode.name);
    if (currentNode.name.toLowerCase().includes(searchTerm)) {
      console.log('Match found:', currentNode.name);
      matches.push(currentNode);
    }
    if (currentNode.children) {
      currentNode.children.forEach(traverse);
    }
  }
  
  traverse(node);
  return matches;
}

// ===============================
// 获取节点的dataIndex（简化版）
// ===============================
function getNodeDataIndex(root, targetNode) {
  let index = 0;
  
  function traverse(currentNode) {
    if (currentNode === targetNode) {
      return index;
    }
    index++;
    if (currentNode.children) {
      for (const child of currentNode.children) {
        const result = traverse(child);
        if (result !== -1) return result;
      }
    }
    return -1;
  }
  
  return traverse(root);
}

// ===============================
// 清除搜索高亮
// ===============================
function clearSearchHighlights() {
  const data = currentViewMode === 'org' ? preprocessedOrgData : preprocessedStaffData;
  
  function resetHighlights(node) {
    console.log('Resetting node:', node.name);
    node.itemStyle = { ...node.itemStyle, borderColor: '#1f2d3d', borderWidth: 1 };
    if (node.children) {
      node.children.forEach(resetHighlights);
    }
  }
  
  resetHighlights(data);
  highlightedNodes = [];
  
  // 重新渲染图表
  const option = myChart.getOption();
  option.series[0].data = [data];
  option.series[0].initialTreeDepth = currentDepth;
  myChart.setOption(option, true);
}

// ===============================
// 折叠全部节点
// ===============================
function collapseAllNodes() {
  console.log('折叠全部节点');
  isAllExpanded = false;
  currentDepth = 0;
  
  // 获取当前option
  const option = myChart.getOption();
  
  if (option.series && option.series[0]) {
    // 创建只包含根节点的折叠数据
    const treeData = option.series[0].data[0];
    const collapsedData = {
      name: treeData.name,
      itemStyle: treeData.itemStyle,
      symbolSize: treeData.symbolSize,
      children: [] // 移除所有子节点
    };
    
    // 重新设置数据为只显示根节点
    option.series[0].data = [collapsedData];
    option.series[0].initialTreeDepth = 1; // 显示根节点
    option.series[0].lineStyle = { width: 0 }; // 隐藏连接线
    
    // 重新设置图表选项
    myChart.setOption(option, true);
    
    // 调整容器尺寸
    setTimeout(() => {
      adjustChartContainer();
      
      // 更新按钮状态
      updateExpandButtonState();
    }, 300);
  }
}

// ===============================
// 递归折叠所有节点
// ===============================
function collapseAll(node) {
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      child.collapsed = true;
      collapseAll(child);
    });
  }
}

// ===============================
// 更新展开按钮状态
// ===============================
function updateExpandButtonState() {
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');
  
  if (!expandAllBtn || !collapseAllBtn) return;
  
  if (isAllExpanded) {
    expandAllBtn.style.opacity = '0.6';
    expandAllBtn.style.pointerEvents = 'none';
    collapseAllBtn.style.opacity = '1';
    collapseAllBtn.style.pointerEvents = 'auto';
  } else {
    expandAllBtn.style.opacity = '1';
    expandAllBtn.style.pointerEvents = 'auto';
    collapseAllBtn.style.opacity = '0.6';
    collapseAllBtn.style.pointerEvents = 'none';
  }
}

// ===============================
// 设置缩放比例
// ===============================
function setZoom(zoomLevel) {
  // 限制缩放范围
  zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel));
  
  // 更新当前缩放比例
  currentZoom = zoomLevel;
  
  // 更新滑块和显示
  const zoomSlider = document.getElementById('zoom-slider');
  const zoomPercent = document.getElementById('zoom-percent');
  
  if (zoomSlider) {
    zoomSlider.value = Math.round(zoomLevel * 100);
  }
  
  if (zoomPercent) {
    zoomPercent.textContent = `${Math.round(zoomLevel * 100)}%`;
  }
  
  // 应用缩放变换
  const chartWrapper = document.querySelector('.chart-inner-wrapper');
  if (chartWrapper) {
    chartWrapper.style.transform = `scale(${zoomLevel})`;
    
    // 调整包装器尺寸以保持正确的滚动区域
    const originalWidth = chartWrapper.offsetWidth;
    const originalHeight = chartWrapper.offsetHeight;
    
    // 计算缩放后的尺寸
    const scaledWidth = originalWidth * zoomLevel;
    const scaledHeight = originalHeight * zoomLevel;
    
    // 更新包装器尺寸
    chartWrapper.style.width = `${scaledWidth}px`;
    chartWrapper.style.height = `${scaledHeight}px`;
    
    console.log(`缩放比例: ${zoomLevel} (${Math.round(zoomLevel * 100)}%)`);
  }
}

// ===============================
// 预处理：统一控制节点大小 & 颜色（不改 JSON）
// ✅ 修改：增加长方形节点宽度，使其更宽
// ===============================
function preprocessTree(node, depth = 0) {
  // ✅ 修改：使用更宽的竖长条形节点尺寸 [宽度, 高度]
  const levelConfig = [
    { size: [30, 180], color: '#2c3e50' }, // 皇帝 / 顶层（更宽的竖长条形）
    { size: [30, 80], color: '#34495e' }, // 三省（更宽的竖长条形）
    { size: [30, 70], color: '#3b6ea5' }, // 六部（更宽的竖长条形）
    { size: [30, 120], color: '#4aa3df' }, // 下属机构（更宽的竖长条形）
    { size: [30, 120], color: '#7fb3d5' }  // 更深层（更宽的竖长条形）
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
// 获取子节点颜色（确保三省六部下节点颜色不重复）
// ===============================
function getSubNodeColor(dept, nodeName) {
  // 获取该部门的颜色集合
  const colorSet = subNodeColors[dept] || subNodeColors['其他'];
  
  // 初始化该部门的颜色索引
  if (!departmentColorIndex[dept]) {
    departmentColorIndex[dept] = 0;
  }
  
  // 为节点计算一个固定的颜色索引（基于节点名称哈希）
  let hash = 0;
  for (let i = 0; i < nodeName.length; i++) {
    hash = nodeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorSet.length;
  
  return colorSet[index];
}

// ===============================
// 计算员额节点大小（圆形节点，使用半径）
// ===============================
function calculateCircleNodeSize(staffNum, maxStaff) {
  if (!staffNum || staffNum <= 0) {
    return 12; // 最小半径
  }
  
  const minRadius = 12; // 最小半径
  const maxRadius = 35; // 最大半径
  
  // 线性缩放
  let radius = minRadius;
  
  if (maxStaff > 0) {
    const ratio = staffNum / maxStaff;
    radius = minRadius + ratio * (maxRadius - minRadius);
  }
  
  return Math.max(minRadius, Math.min(radius, maxRadius));
}

// ===============================
// 将字符串拆分为单个字符，用于竖向显示
// ✅ 修改：增加每行最大字符数，因为节点更宽了
// ===============================
function splitTextForVertical(text, maxLength = 8) {
  if (!text) return '';
  
  // 如果文本太长，先截断
  let displayText = text;
  if (text.length > maxLength) {
    displayText = text.substring(0, maxLength) + '...';
  }
  
  // 将字符串拆分为单个字符，用换行符连接
  return displayText.split('').join('\n');
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
    node.circleRadius = calculateCircleNodeSize(staffNum, globalMaxStaff);
    
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
  // 重置部门颜色索引
  Object.keys(departmentColorIndex).forEach(key => {
    departmentColorIndex[key] = 0;
  });
  
  // 提取部门统计信息
  const departmentStats = extractDepartmentStats(treeData);
  
  // 计算每个部门的平均员额
  Object.values(departmentStats).forEach(stat => {
    stat.averageStaff = stat.nodeCount > 0 ? Math.round(stat.totalStaff / stat.nodeCount) : 0;
  });
  
  // 预处理每个节点的可视化属性
  const processNode = (node, depth = 0) => {
    const dept = node.department || '其他';
    const staffNum = node.staffNumber || 0;
    const stat = departmentStats[dept];
    const nodeType = node.nodeType || 'official';
    const isTopDepartment = ['中书省', '门下省', '尚书省', '吏部', '户部', '礼部', '兵部', '刑部', '工部'].includes(dept);
    
    // 设置节点大小为半径值（圆形节点）
    node.symbolSize = node.circleRadius || 12;
    
    // 设置节点颜色
    let nodeColor;
    if (isTopDepartment && depth > 0) {
      // 如果是三省六部的子节点，使用不重复的颜色
      nodeColor = getSubNodeColor(dept, node.name);
    } else {
      // 顶层节点或非三省六部节点使用部门颜色
      nodeColor = departmentColors[dept] || departmentColors.default;
    }
    
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
      shadowBlur: 4,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowOffsetY: 1
    };
    
    // 为标签选择对比色
    const textColor = getContrastColor(nodeColor);
    node.labelColor = textColor;
    
    // 保存节点类型信息用于工具提示
    node.nodeType = nodeType;
    node.departmentStat = stat;
    node.depth = depth; // 保存节点深度
    
    // 处理子节点
    if (node.children && node.children.length) {
      node.children.forEach(child => {
        child.parentName = node.name;
        processNode(child, depth + 1);
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
// 计算树图的尺寸（用于动态调整画布）
// ✅ 修改：改进高度计算，确保树状图可以向下扩展
// ===============================
function calculateTreeDimensions(node, depth = 0, levelInfo = {}) {
  // 统计每一层的节点数
  if (!levelInfo[depth]) {
    levelInfo[depth] = {
      nodeCount: 0,
      maxWidth: 0,
      maxHeight: 0
    };
  }
  levelInfo[depth].nodeCount++;
  
  // 计算节点的宽度和高度
  const nodeWidth = Array.isArray(node.symbolSize) ? node.symbolSize[0] : (node.symbolSize * 2);
  const nodeHeight = Array.isArray(node.symbolSize) ? node.symbolSize[1] : (node.symbolSize * 2);
  
  const nodeWidthWithGap = nodeWidth + 40; // 增加横向间距
  const nodeHeightWithGap = nodeHeight + 30; // 增加纵向间距
  
  levelInfo[depth].maxWidth = Math.max(levelInfo[depth].maxWidth, nodeWidthWithGap);
  levelInfo[depth].maxHeight = Math.max(levelInfo[depth].maxHeight, nodeHeightWithGap);
  
  let maxDepth = depth;
  if (node.children && node.children.length) {
    node.children.forEach(child => {
      const childDepth = calculateTreeDimensions(child, depth + 1, levelInfo);
      maxDepth = Math.max(maxDepth, childDepth);
    });
  }
  
  // 返回时计算总的宽度和高度
  if (depth === 0) {
    // 计算总宽度（取最宽的一层）
    let totalWidth = 0;
    for (let i = 0; i <= maxDepth; i++) {
      if (levelInfo[i]) {
        // ✅ 重要修改：增加横向间距，让树状图更宽敞
        const levelWidth = levelInfo[i].nodeCount * levelInfo[i].maxWidth * 1.1;
        totalWidth = Math.max(totalWidth, levelWidth);
      }
    }
    
    // 计算总高度
    // ✅ 重要修改：使用更大的纵向间距，确保树状图可以向下扩展
    const levelGap = 150; // 增加层级间距
    const totalHeight = (maxDepth + 1) * levelGap + 200; // 增加额外边距
    
    return {
      width: Math.max(1200, totalWidth), // 增加最小宽度
      height: Math.max(800, totalHeight), // 增加最小高度
      maxDepth: maxDepth
    };
  }
  
  return maxDepth;
}

// ===============================
// 动态调整图表容器尺寸
// ✅ 修改：改进容器尺寸调整，支持纵向滚动
// ===============================
function adjustChartContainer() {
    const chartContainer = document.querySelector('.chart-inner-wrapper');
    const chartDom = document.getElementById('org-chart');
    
    if (!chartContainer || !chartDom) return;
    
    // 获取ECharts实例的option
    const option = myChart.getOption();
    if (!option || !option.series || !option.series[0]) return;
    
    // 计算需要的尺寸
    const treeData = option.series[0].data[0];
    const dimensions = calculateTreeDimensions(treeData);
    
    // ✅ 重要修改：使用实际计算的尺寸，不再缩小
    const chartWidth = dimensions.width;
    const chartHeight = dimensions.height;
    
    // 应用当前缩放比例
    const scaledWidth = chartWidth * currentZoom;
    const scaledHeight = chartHeight * currentZoom;
    
    // 设置容器尺寸
    chartContainer.style.width = `${scaledWidth}px`;
    chartContainer.style.height = `${scaledHeight}px`;
    
    // 应用缩放变换
    chartContainer.style.transform = `scale(${currentZoom})`;
    
    console.log(`调整图表容器尺寸: ${scaledWidth}x${scaledHeight}, 缩放: ${currentZoom}`);
    
    // 重新设置ECharts尺寸
    setTimeout(() => {
        myChart.resize({
            width: chartWidth,
            height: chartHeight
        });
        
        // 调整滚动位置，确保能看到树图顶部
        const outerContainer = document.querySelector('.chart-container');
        if (outerContainer) {
            outerContainer.scrollTop = 0;
            outerContainer.scrollLeft = 0;
        }
    }, 50);
}

// ===============================
// 切换到组织架构视图
// ✅ 修改：修复标签显示问题，移除省略号
// ===============================
function switchToOrgView() {
  if (!originalTreeData) return;
  
  console.log('切换到组织架构视图');
  
  // 重置缩放比例
  setZoom(1.0);
  
  // 预处理树数据（深拷贝避免污染原始数据）
  if (!preprocessedOrgData) {
    preprocessedOrgData = JSON.parse(JSON.stringify(originalTreeData));
    preprocessTree(preprocessedOrgData);
  }
  
  // ✅ 重要修改：调整图表配置，修复标签显示问题
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
            ${d.value ? `<div><b>级别：</b>${d.value}</div>` : ''}
            ${d.staffEstimate ? `<div><b>人数：</b>${d.staffEstimate}</div>` : ''}
            ${d.description ? `<hr style="margin: 6px 0; border-color: #eee;"/><div><b>职能：</b>${d.description}</div>` : ''}
          </div>
        `;
      }
    },
    series: [
      {
        type: 'tree',
        data: [preprocessedOrgData],
        orient: 'TB',                 // 纵向
        layout: 'orthogonal',         // 正交布局（最稳定）
        edgeShape: 'polyline',        // 直线
        edgeForkPosition: '50%',
        top: 50,                      // ✅ 增加顶部边距，让树状图可以向上滚动
        left: 50,                     // ✅ 增加左边距
        right: 50,                    // ✅ 增加右边距
        bottom: 150,                  // ✅ 重要修改：大幅增加底部边距，让树状图可以向下扩展
        nodeGap: 30,                  // ✅ 增加横向节点间距，适应更宽的节点
        levelGap: 120,                // ✅ 增加纵向层级间距
        roam: false,                  // 禁止缩放 & 拖拽
        expandAndCollapse: true,
        initialTreeDepth: currentDepth, // 根据展开状态设置初始深度
        symbol: 'rect',               // 使用矩形节点（竖长条形）
        symbolSize: val => val,
        label: {
          show: true, // ✅ 新增：确保标签显示
          position: 'inside',
          color: '#fff',
          fontSize: 10,               // ✅ 调整字体大小，适应节点大小
          lineHeight: 10,             // ✅ 减小行高，显示更多字符
          width: 28,                  // ✅ 调整标签宽度
          overflow: 'break',          // 允许文字换行
          align: 'center',
          verticalAlign: 'middle',
          fontFamily: 'KaiTi, STKaiti, SimKai, KaiTi_GB2312, "楷体", serif',
          // ✅ 重要修复：直接返回竖向排列的文字，不截断
          formatter: function(params) {
            const name = params.data.name || '';
            // 直接将每个字符用换行符连接，显示完整名称
            return name.split('').join('\n');
          }
        },
        lineStyle: {
          color: '#aaa',
          width: 1.2,                 // 减小连线宽度
          curveness: 0
        },
        emphasis: {
          focus: 'descendant',
          label: {
            show: true,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: 12,
            padding: 4,
            borderRadius: 4
          }
        },
        animationDuration: 300,
        animationDurationUpdate: 300
      }
    ]
  };
  
  myChart.setOption(option, true);
  
  // 重新绑定事件
  bindChartEvents();
  
  // 调整容器尺寸
  setTimeout(adjustChartContainer, 100);
  
  // 确保图表正确显示
  myChart.resize();
  
  // 重置滚动位置
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    chartContainer.scrollTop = 0;
    chartContainer.scrollLeft = 0;
  }
  
  // 更新按钮状态
  updateExpandButtonState();
}

// ===============================
// 切换到员额可视化视图
// ✅ 修改：确保三省六部下节点颜色不重合，移除省略号
// ===============================
function switchToStaffView() {
  if (!originalTreeData) return;
  
  console.log('切换到员额可视化视图');
  
  // 重置缩放比例
  setZoom(1.0);
  
  // 深拷贝原始数据，避免污染
  if (!preprocessedStaffData) {
    const processedData = preprocessTreeForStaffView(JSON.parse(JSON.stringify(originalTreeData)));
    preprocessedStaffData = processedData.treeData;
  }
  const departmentStats = processedData.departmentStats;
  
  // 将部门统计转换为数组
  const statsArray = Object.values(departmentStats);
  
  // 按员额总数排序
  statsArray.sort((a, b) => b.totalStaff - a.totalStaff);
  
  // 计算所有节点中的最大员额，用于显示缩放信息
  const globalMaxStaff = statsArray.reduce((max, stat) => Math.max(max, stat.maxStaff), 0);
  
  // ✅ 重要修改：员额视图使用圆形节点，确保三省六部下节点颜色不重合
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
        const deptColor = d.itemStyle?.color || departmentColors[dept] || departmentColors.default;
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
          <div style="text-align: left; min-width: 250px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${d.name}</div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <span style="display: inline-block; width: 14px; height: 14px; background: ${deptColor}; border: 1px solid ${borderColor}; margin-right: 6px; border-radius: 50%;"></span>
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
              <span>节点半径: ${d.symbolSize || d.circleRadius || 12}px</span>
            </div>
            ${d.value ? `<div style="margin-bottom: 6px;"><b>级别：</b>${d.value}</div>` : ''}
            ${deptInfo}
            ${d.description ? `<hr style="margin: 8px 0; border-color: #eee;"/><div><b>职能：</b>${d.description}</div>` : ''}
          </div>
        `;
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,                      // 减少右边距
      top: 20,
      bottom: 20,
      textStyle: {
        color: '#333',
        fontSize: 9,                  // 减小图例字体
        fontFamily: 'KaiTi, STKaiti, SimKai, KaiTi_GB2312, "楷体", serif' // 楷书字体
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
        data: [preprocessedStaffData],
        orient: 'TB',                 // 纵向
        layout: 'orthogonal',         // 正交布局（最稳定）
        edgeShape: 'polyline',        // 直线
        edgeForkPosition: '50%',
        top: 50,                      // ✅ 增加顶部边距
        left: 50,                     // ✅ 增加左边距
        right: '16%',                 // 增加给图例的空间
        bottom: 150,                  // ✅ 重要修改：大幅增加底部边距，让树状图可以向下扩展
        nodeGap: 25,                  // ✅ 增加横向节点间距，适应圆形节点
        levelGap: 100,                // ✅ 增加纵向层级间距，适应圆形节点
        roam: false,                  // 禁止缩放 & 拖拽
        expandAndCollapse: true,
        initialTreeDepth: currentDepth, // 根据展开状态设置初始深度
        symbol: 'circle',             // ✅ 重要修改：使用圆形节点
        symbolSize: val => val,
        label: {
          show: true, // ✅ 确保标签显示
          position: 'inside',         // 圆形节点内标签
          color: (params) => {
            return params.data.labelColor || '#333';
          },
          fontSize: 9,                // 减小字体大小
          lineHeight: 12,
          overflow: 'break',          // 允许文字换行
          align: 'center',
          verticalAlign: 'middle',
          fontFamily: 'KaiTi, STKaiti, SimKai, KaiTi_GB2312, "楷体", serif', // 楷书字体
          formatter: (params) => {
            const name = params.data.name || '';
            const staffNum = params.data.staffNumber || 0;
            const radius = params.data.symbolSize || params.data.circleRadius || 12;
            
            // 根据节点大小决定显示内容
            if (radius >= 15 && staffNum > 0) {
              // 显示完整名称和员额数字
              return `${name}\n${staffNum}人`;
            } else if (staffNum > 0) {
              // 显示员额数字
              return `${staffNum}人`;
            }
            
            // 显示完整名称
            return name;
          }
        },
        lineStyle: {
          color: '#070707',
          width: 1.0,                 // 减小连线宽度
          curveness: 0
        },
        emphasis: {
          focus: 'descendant',
          itemStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1.5,
            borderColor: '#ff5722'
          },
          label: {
            show: true,
            fontSize: 9,
            fontWeight: 'bold',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: [1, 2],
            borderRadius: 2,
            fontFamily: 'KaiTi, STKaiti, SimKai, KaiTi_GB2312, "楷体", serif' // 楷书字体
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
  
  // 调整容器尺寸
  setTimeout(adjustChartContainer, 100);
  
  // 确保图表正确显示
  myChart.resize();
  
  // 重置滚动位置
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    chartContainer.scrollTop = 0;
    chartContainer.scrollLeft = 0;
  }
  
  // 更新按钮状态
  updateExpandButtonState();
}

// ===============================
// 绑定组织架构图表事件
// ===============================
function bindChartEvents() {
  // 先移除所有事件监听器
  myChart.off('click');
  myChart.off('treeexpand');
  myChart.off('treecollapse');
  
  // 点击节点 → 右侧信息面板 或 展开第一层
  myChart.on('click', params => {
    const nodeData = params.data;
    if (nodeData && nodeData.name === '唐代中央官制' && !isAllExpanded) {
      // 点击根节点且当前折叠状态，展开第一层
      expandAllNodes();
    } else if (nodeData) {
      // 显示信息面板
      updateInfoPanel(nodeData);
    }
  });
  
  // 展开 / 折叠时 → 调整容器尺寸
  myChart.on('treeexpand', () => {
    setTimeout(adjustChartContainer, 100);
  });
  myChart.on('treecollapse', () => {
    setTimeout(adjustChartContainer, 100);
  });
}

// ===============================
// 初始化树状图
// ===============================
function initChart(treeData) {
  // 预处理组织架构数据
  preprocessedOrgData = JSON.parse(JSON.stringify(treeData));
  preprocessTree(preprocessedOrgData);
  
  // 设置默认视图（组织架构）
  switchToOrgView();
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
    const deptColor = node.itemStyle?.color || departmentColors[dept] || departmentColors.default;
    const nodeType = node.nodeType === 'department' ? '部门节点' : '职官节点';
    const borderColor = node.itemStyle?.borderColor || '#FFFFFF';
    const borderDesc = borderColor === '#000000' ? '黑色实线边缘' : '白色实线边缘';
    
    html += `<p><b>类型：</b>${nodeType} (${borderDesc})</p>`;
    html += `<p><b>部门：</b> <span style="display: inline-block; width: 12px; height: 12px; background: ${deptColor}; border: 1px solid ${borderColor}; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>${dept}</p>`;
    
  }

  if (node.value) html += `<p><b>级别：</b>${node.value}</p>`;
  
  if (node.staffEstimate || node.staffNumber) {
    const staffNum = node.staffNumber || parseInt(node.staffEstimate) || 0;
    html += `<p><b>员额：</b>${staffNum}人`;
    
    // 在员额视图下，添加节点大小信息
    if (currentViewMode === 'staff') {
      const radius = node.circleRadius || node.symbolSize || 12;
      html += ` <span style="color:#666;font-size:12px;">(节点半径: ${radius}px)</span>`;
      
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
  if (node.description) html += `<p><b>职能：</b>${node.description}</p>`;

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