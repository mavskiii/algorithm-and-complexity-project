import { useEffect, useMemo, useRef, useState } from 'react';
import { Background, BaseEdge, ConnectionMode, Controls, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow, useNodesState, type Edge, type EdgeProps, type Node, type NodeProps, type ReactFlowInstance } from '@xyflow/react';
import { useTheme } from './theme';
export type GraphVertex = { id:string; x:number; y:number; status?:string; metric?:string };
export type GraphLink = { id:string; from:string; to:string; weight?:number; status?:string };
type VertexNode=Node<{label:string;status:string;metric?:string}>;
function Vertex({data}:NodeProps<VertexNode>) {
  return <div className={`flow-vertex ${data.status}`}>
    {[Position.Top,Position.Right,Position.Bottom,Position.Left].map(position=><Handle key={position} type="source" position={position} id={position} isConnectable={false}/>)}
    <span>{data.label}</span>{data.metric!==undefined&&<small>{data.metric}</small>}
  </div>;
}
const nodeTypes={vertex:Vertex};
function ParallelEdge({id,sourceX,sourceY,targetX,targetY,markerEnd,style,label}:EdgeProps) {
  const dx=targetX-sourceX,dy=targetY-sourceY,length=Math.hypot(dx,dy)||1;
  const cx=(sourceX+targetX)/2-dy/length*65,cy=(sourceY+targetY)/2+dx/length*65;
  const x=sourceX*.25+cx*.5+targetX*.25,y=sourceY*.25+cy*.5+targetY*.25;
  return <><BaseEdge id={id} path={`M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`} markerEnd={markerEnd} style={style}/><EdgeLabelRenderer><div className="flow-edge-label nodrag nopan" style={{transform:`translate(-50%, -50%) translate(${x}px, ${y}px)`}}>{label}</div></EdgeLabelRenderer></>;
}
const edgeTypes={parallel:ParallelEdge};
export default function FlowGraph({vertices,links,directed=false,compact=false}:{vertices:GraphVertex[];links:GraphLink[];directed?:boolean;compact?:boolean}) {
  const {theme}=useTheme();
  const canvas=useRef<HTMLDivElement>(null);
  const [instance,setInstance]=useState<ReactFlowInstance<VertexNode>|null>(null);
  const [nodes,setNodes,onNodesChange]=useNodesState<VertexNode>([]);
  useEffect(()=>{
    if(!instance||!canvas.current)return;
    let frame=0;
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>void instance.fitView({padding:.24,maxZoom:1.1}))});
    observer.observe(canvas.current);
    return()=>{observer.disconnect();cancelAnimationFrame(frame)};
  },[instance]);
  useEffect(()=>setNodes(previous=>vertices.map(v=>({id:v.id,type:'vertex',position:previous.find(n=>n.id===v.id)?.position??{x:v.x,y:v.y},data:{label:v.id,metric:v.metric,status:v.status??''},ariaLabel:`Vertex ${v.id}${v.metric===undefined?'':`, ${v.metric}`}${v.status?`, ${v.status}`:''}`}))),[vertices,setNodes]);
  const edges=useMemo<Edge[]>(()=>links.map(link=>{
    const a=nodes.find(n=>n.id===link.from)?.position,b=nodes.find(n=>n.id===link.to)?.position;
    const dx=(b?.x??0)-(a?.x??0),dy=(b?.y??0)-(a?.y??0);
    const horizontal=Math.abs(dx)>Math.abs(dy), source=horizontal?(dx>=0?Position.Right:Position.Left):(dy>=0?Position.Bottom:Position.Top),target=horizontal?(dx>=0?Position.Left:Position.Right):(dy>=0?Position.Top:Position.Bottom);
    const reciprocal=directed&&links.some(e=>e.from===link.to&&e.to===link.from);
    const color=link.status==='rejected'?'var(--danger)':link.status==='active'?'var(--accent)':link.status==='chosen'?'var(--teal)':'var(--edge)';
    return {id:link.id,source:link.from,target:link.to,sourceHandle:source,targetHandle:target,type:reciprocal?'parallel':'straight',label:link.weight,style:{stroke:color,strokeWidth:link.status?3:2,strokeDasharray:link.status==='rejected'?'6 4':undefined},labelStyle:{fill:'var(--ink)',fontSize:16,fontWeight:600},labelBgStyle:{fill:'var(--surface)'},labelBgPadding:[7,4],labelBgBorderRadius:5,markerEnd:directed?{type:MarkerType.ArrowClosed,color,width:18,height:18}:undefined,ariaLabel:`${link.from} ${directed?'to':'connected to'} ${link.to}${link.weight===undefined?'':`, weight ${link.weight}`}${link.status?`, ${link.status}`:''}`};
  }),[links,nodes,directed]);
  return <div ref={canvas} className={compact?'flow-canvas compact':'flow-canvas'}><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onInit={setInstance} nodeTypes={nodeTypes} edgeTypes={edgeTypes} connectionMode={ConnectionMode.Loose} colorMode={theme} fitView fitViewOptions={{padding:.24,maxZoom:1.1}} minZoom={.3} maxZoom={2.5} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} zoomOnScroll={false} preventScrolling={false} aria-label="Interactive graph: drag vertices, pan, or use the zoom controls"><Background color="var(--line)" gap={20}/><Controls showInteractive={false}/></ReactFlow></div>;
}
