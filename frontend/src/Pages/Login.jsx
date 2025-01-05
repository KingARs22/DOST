import React, {useState} from 'react'
import './CSS/Loginsign.css';
import {Link, useNavigate} from 'react-router-dom'
import axios from 'axios'

const Login = () => {
    const [email,setEmail] = useState()
    const [password,setPassword] = useState()
    const navigate = useNavigate()

    const handleSubmit = (e)=>{
      e.preventDefault()
      axios.post('http://localhost:5000/login',{email,password})
      .then(result => {console.log(result)
        if(result.data.message === "Success"){
            const token = result.data.token;
            localStorage.setItem('jwt',token);
            const userId = result.data.userId;
            navigate('/home', { state: { userId } })
        }
      })
      
      .catch(err => {
        alert(err.response.data.message)
        console.log(err)
      })
    }

  return (
    <div className='loginsignup'>
      <div className="loginsignup-container">
        <h1>LogIn</h1>
        <form onSubmit={handleSubmit}>
          <div className="loginsignup-fields">
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              onChange={(e)=>setEmail(e.target.value)}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={(e)=>setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="submit-btn">Continue</button>
        </form>
        <p className='loginsignup-login'>
          Don't have an account? <Link to="/">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}

export default Login