import axios from 'axios';

const client = axios.create({
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // Enable cookies for session persistence
});

export default client;
