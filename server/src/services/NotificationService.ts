import { Connection, NotificationType } from 'vscode-languageserver';

export class NotificationService {
    private readonly type = new NotificationType<StatusParams>(
        'jsf/status'
      )

    private readonly connection: Connection;
    constructor(connection: Connection) {
        this.connection = connection;
    }
    
    public notify(state: Status, message: string): void {
        this.connection.sendNotification(this.type, {message: message, state: state });
    }

    public error(message: string): void {
        this.notify(Status.ERROR, message);
    }

    public warn(message: string): void {
        this.notify(Status.WARN, message);
    }

    public info(message: string): void {
        this.notify(Status.OK, message);
    }
}

interface StatusParams {
    message: string;
    state: Status;
}

export enum Status {
    OK = 1,
    WARN = 2,
    ERROR = 3
}