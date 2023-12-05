import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Deploy from './pages/Deploy';
import CodeEditor from './pages/CodeEditor';
import PersonalCloud from './pages/PersonalCloud';
import GlobalCloud from './pages/GlobalCloud';
import Sidebar from './components/Sidebar';
import Code from './pages/Code';

function App() {
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  return (
    <>
      <div className='flex w-full'>
        {showSidebar && <Sidebar />}
        <div className='w-full'>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor" element={<CodeEditor setShowSidebar={setShowSidebar} />}></Route>
            <Route path="/code" element={<Code />}></Route>
            <Route path="/deploy" element={<Deploy />}></Route>
            <Route path="/personal-cloud" element={<PersonalCloud />}></Route>
            <Route path="/global-cloud" element={<GlobalCloud />}></Route>
          </Routes>
        </div>
      </div>
    </>
  )
}

export default App