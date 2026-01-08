// main.js

// 初始化 ECharts 实例
const myChart = echarts.init(document.getElementById('org-chart'));

// 异步加载 JSON 数据
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        initChart(data);
    })
    .catch(error => console.error('读取 data.json 失败:', error));

/**
 * 初始化组织结构图
 * @param {Object} treeData
 */
function initChart(treeData) {
    const option = {
        backgroundColor: '#ffffff',
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            formatter: params => {
                const d = params.data;
                if (!d) return '';
                return `
                    <b>${d.name}</b><br/>
                    ${d.value ? `<span style="color:#666">职位/职能：${d.value}</span><br/>` : ''}
                    ${d.staffEstimate ? `<span style="color:#666">人数估计：${d.staffEstimate}</span><br/>` : ''}
                    ${d.description ? `<hr/>${d.description}` : ''}
                `;
            }
        },
        series: [
            {
                type: 'tree',
                data: [treeData],

                top: 20,
                left: 20,
                bottom: 20,
                right: 20,

                symbolSize: params => params?.data?.symbolSize ?? 16,
                symbol: 'rect',
                itemStyle: {
                    color: params => params?.data?.itemStyle?.color || '#3498db'
                },
                label: {
                    position: 'inside',
                    verticalAlign: 'middle',
                    align: 'center',
                    fontSize: 12,
                    color: '#fff',
                    lineHeight: 20,
                    width: 100,
                    overflow: 'truncate'
                },

                orient: 'TB',               // 自上而下
                edgeShape: 'polyline',       // 折线连接
                layout: 'orthogonal',        // 固定布局
                nodeGap: 40,                 // 节点水平间距，更紧凑
                levelGap: 100,               // 层级纵向间距，更紧凑

                expandAndCollapse: true,
                initialTreeDepth: 2,         // 默认展开2层
                roam: false,                 // 禁止缩放和整体拖动
                lineStyle: { color: '#ccc', width: 2, curveness: 0 },

                leaves: {
                    label: { position: 'bottom', align: 'center', color: '#555' }
                },
                emphasis: { focus: 'descendant' },

                animationDuration: 800,
                animationDurationUpdate: 600
            }
        ]
    };

    myChart.setOption(option);

    // 点击节点显示信息
    myChart.on('click', params => {
        if (!params.data) return;
        updateInfoPanel(params.data);
    });

    // 窗口自适应
    window.addEventListener('resize', () => {
        myChart.resize();
    });
}

/**
 * 更新右侧信息面板
 * @param {Object} node
 */
function updateInfoPanel(node) {
    const panel = document.querySelector('.selected-info');
    if (!panel) return;

    let html = `<h3>${node.name}</h3>`;
    if (node.value) html += `<p><b>职位/职能：</b>${node.value}</p>`;
    if (node.staffEstimate) html += `<p><b>人数估计：</b>${node.staffEstimate}</p>`;
    if (node.quota) html += `<p><b>名额：</b>${node.quota}</p>`;
    if (node.description) html += `<p><b>说明：</b>${node.description}</p>`;

    if (node.historicalFigures && node.historicalFigures.length) {
        html += `<p><b>历史人物：</b></p><ul>`;
        node.historicalFigures.forEach(f => {
            html += `<li>${f.name} (${f.era}) - ${f.positions.join(', ')}${f.note ? '，' + f.note : ''}</li>`;
        });
        html += `</ul>`;
    }

    panel.innerHTML = html;
}
