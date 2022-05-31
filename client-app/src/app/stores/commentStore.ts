import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { makeAutoObservable, runInAction } from "mobx";
import { ChatComment } from "../models/comment";
import { store } from "./store";

export default class CommmentStore {
    comments: ChatComment[] = [];
    hubConnection:  HubConnection | null = null;

    cosntructor() {
        makeAutoObservable(this);
    }

    createHubConnection = (activityId : string) => {
        if(store.activityStore.selectedActivity) {
            this.hubConnection = new HubConnectionBuilder()
                    .withUrl('https://localhost:5001/chat?activityId=' + activityId, {
                        accessTokenFactory: () => store.userStore.user?.token!
                    })
                    .withAutomaticReconnect()
                    .configureLogging(LogLevel.Information)
                    .build();

            this.hubConnection.start().catch(error => console.log('error in signalr:' + error));

            this.hubConnection.on('LoadComments', (comments: ChatComment[]) => {
                runInAction(() => this.comments = comments);
            });

            this.hubConnection.on('ReceiveComment', (comment: ChatComment) => {
                runInAction(() => this.comments.push(comment));
            })
        }
    }

    stopHubConnection = () => {
        this.hubConnection?.stop().catch(error => console.log('Error in stopping signalr:' + error));
    }

    clearComments = () => {
        this.comments = [];
        this.stopHubConnection();
    }

    addComment = async (values: any) => {
        values.activityId = store.activityStore.selectedActivity?.id;
        try {
            await this.hubConnection?.invoke('SendComment', values);
        } catch (error) {
            console.log(error);
        }
    }
}